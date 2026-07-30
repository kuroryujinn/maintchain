// Audit trail endpoints (MVP)
// Reads append-only `approvals` rows and returns a chronological event list.
//
// The auditor **no longer triggers on-chain transactions via the backend**.
// The user (auditor) signs the certificate issuance transaction in Freighter.
// The backend only:
//   1. Stores the auditor's approval and decision in the database
//   2. Accepts the on-chain transaction hash submitted by the frontend
//   3. Verifies the transaction succeeded on the network
//   4. Updates the record status

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use uuid::Uuid;

use crate::auth::resolve_user_id_from_address;
use crate::{AppState, MaintenanceResponse};

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
    pub transaction_hash: Option<String>,  // On-chain tx hash from user's Freighter signing
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
    db: &sqlx::PgPool,
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
        "#
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
        "#
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
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<ApproveAuditorRequest>,
) -> Result<Json<MaintenanceResponse>, (StatusCode, String)> {
    let note = req.decision_note;
    let tx_hash = req.transaction_hash;

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

    // 2. If a transaction hash was provided by the frontend, verify it on-chain
    if let Some(ref tx_hash) = tx_hash {
        let client = crate::soroban_client::SorobanClient::new();
        // The frontend should have submitted issue_certificate via Freighter.
        // We verify the transaction exists and succeeded.
        let caller = "user_via_freighter"; // We trust the user submitted via their wallet
        let verified = client.verify_transaction(tx_hash, caller).await
            .map_err(|e| {
                tracing::error!("on-chain transaction verification failed for tx={tx_hash}: {e:?}");
                (StatusCode::BAD_GATEWAY, "Failed to verify on-chain transaction".to_string())
            })?;

        if !verified {
            return Err((
                StatusCode::BAD_GATEWAY,
                format!("Transaction {tx_hash} was not found or did not succeed on the Stellar network")
            ));
        }

        tracing::info!("audit: on-chain transaction {tx_hash} verified successfully");
    }

    // 3. Record auditor approval in DB with authenticated user's UUID
    let approver_id = resolve_user_id_from_address(&state.db, &headers).await?;

    sqlx::query(
        r#"
        insert into approvals (maintenance_id, approver_id, role, decision, approval_timestamp, note, on_chain_tx_id)
        values ($1, $2, 'AUDITOR', 'APPROVED', now(), $3, $4)
        "#
    )
    .bind(id)
    .bind(approver_id)
    .bind(note)
    .bind(tx_hash.as_deref())
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 4. Update record status to COMPLIANT
    sqlx::query(
        r#"
        update maintenance_records
        set status = 'COMPLIANT',
            tx_id = $2
        where id = $1
        "#
    )
    .bind(id)
    .bind(tx_hash.as_deref())
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("status update failed: {e}")))?;

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
        "#
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
