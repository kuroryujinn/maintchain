// Audit trail endpoints (MVP)
// Reads append-only `approvals` rows and returns a chronological event list.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};

use uuid::Uuid;

use sha2::{Digest, Sha256};

use crate::{soroban_client::SorobanClient, AppState, MaintenanceResponse};

#[derive(Debug, Serialize)]
pub struct AuditEvent {
    pub id: uuid::Uuid,
    pub maintenance_id: uuid::Uuid,
    pub approver_id: uuid::Uuid,
    pub role: String,
    pub decision: Option<String>,
    pub approval_timestamp: DateTime<Utc>,
    pub note: Option<String>,
    pub on_chain_tx_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuditResponse {
    pub maintenance: MaintenanceResponse,
    pub events: Vec<AuditEvent>,
}

#[derive(Debug, Deserialize)]
pub struct ApproveAuditorRequest {
    pub decision_note: Option<String>,
}

fn row_to_event(row: sqlx::postgres::PgRow) -> AuditEvent {
    AuditEvent {
        id: row.get("id"),
        maintenance_id: row.get("maintenance_id"),
        approver_id: row.get("approver_id"),
        role: row.get("role"),
        decision: row.get("decision"),
        approval_timestamp: row.get("approval_timestamp"),
        note: row.get("note"),
        on_chain_tx_id: row.get("on_chain_tx_id"),
    }
}

async fn get_maintenance_for_audit(
    db: &PgPool,
    id: Uuid,
) -> Result<MaintenanceResponse, StatusCode> {
    let row = sqlx::query(
        r#"
        select
            id as maintenance_id,
            equipment_id,
            technician_id,
            status::text as status,
            evidence_hash,
            created_at as created_at
        from maintenance_records
        where id = $1
        "#,
    )
    .bind(id)
    .fetch_one(db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(MaintenanceResponse {
        maintenance_id: row.get("maintenance_id"),
        equipment_id: row.get("equipment_id"),
        technician_id: row.get("technician_id"),
        status: row.get("status"),
        evidence_hash: row.get("evidence_hash"),
        created_at: row.get("created_at"),
    })
}

pub async fn get_audit_trail(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<AuditResponse>, (StatusCode, String)> {
    let maintenance = get_maintenance_for_audit(&state.db, id)
        .await
        .map_err(|sc| (sc, "audit maintenance not found".to_string()))?;

    let rows = sqlx::query(
        r#"
        select
            id,
            maintenance_id,
            approver_id,
            role,
            decision,
            approval_timestamp,
            note,
            on_chain_tx_id
        from approvals
        where maintenance_id = $1
        order by approval_timestamp asc, id asc
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut events = Vec::with_capacity(rows.len());
    for row in rows {
        events.push(row_to_event(row));
    }

    Ok(Json(AuditResponse {
        maintenance,
        events,
    }))
}

pub async fn approve_by_auditor(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApproveAuditorRequest>,
) -> Result<Json<MaintenanceResponse>, (StatusCode, String)> {
    let note = req.decision_note;

    // 1. Verify supervisor approved (read-only DB check)
    let supervisor_approved: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM approvals WHERE maintenance_id = $1 AND role = 'SUPERVISOR' AND decision = 'APPROVED'"#
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("supervisor check failed: {e}")))?;

    if supervisor_approved.0 == 0 {
        return Err((StatusCode::CONFLICT, "Supervisor has not approved this record yet".to_string()));
    }

    // 2. Compute cert hash
    let mut hasher = Sha256::new();
    hasher.update(id.as_bytes());
    let cert_hash_bytes: [u8; 32] = hasher.finalize().into();

    // 3. BLOCKCHAIN-FIRST: Issue certificate on-chain BEFORE writing to DB.
    //    We call SorobanClient::issue_certificate directly instead of
    //    transition_to_compliant, because that function checks for auditor
    //    approval in the DB which hasn't been inserted yet.
    let client = SorobanClient::new();
    let tx_id = client
        .issue_certificate(id.as_bytes(), &cert_hash_bytes)
        .await
        .map_err(|e| {
            let msg = format!("on-chain certificate issuance failed for maintenance_id={}: {:?}", id, e);
            tracing::error!("{}", msg);
            (StatusCode::BAD_GATEWAY, msg)
        })?;

    // 4. On-chain succeeded — now record auditor approval AND update status in DB
    sqlx::query(
        r#"
        insert into approvals (maintenance_id, approver_id, role, decision, approval_timestamp, note)
        values ($1, $2, 'AUDITOR', 'APPROVED', now(), $3)
        "#,
    )
    .bind(id)
    .bind(Uuid::nil())
    .bind(note)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 5. Update record status to COMPLIANT with the on-chain tx hash
    sqlx::query(
        r#"
        update maintenance_records
        set status = 'COMPLIANT',
            tx_id = $2
        where id = $1
        "#,
    )
    .bind(id)
    .bind(&tx_id)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("status update failed after on-chain success: {e}")))?;

    let row = sqlx::query(
        r#"
        select
            id as maintenance_id,
            equipment_id,
            technician_id,
            status::text as status,
            evidence_hash,
            created_at as created_at
        from maintenance_records
        where id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(MaintenanceResponse {
        maintenance_id: row.get("maintenance_id"),
        equipment_id: row.get("equipment_id"),
        technician_id: row.get("technician_id"),
        status: row.get("status"),
        evidence_hash: row.get("evidence_hash"),
        created_at: row.get("created_at"),
    }))
}
