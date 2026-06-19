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
            note
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

    sqlx::query(
        r#"
        insert into approvals (maintenance_id, approver_id, role, decision, approval_timestamp, note)
        values ($1, $2, 'AUDITOR', $3, now(), $4)
        "#,
    )
    .bind(id)
    .bind(Uuid::nil())
    .bind("APPROVED")
    .bind(note)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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
