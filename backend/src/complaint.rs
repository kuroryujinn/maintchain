//! Compliance verification (Backend verify-only)
//!
//! Backend acts as a read-only verifier between the UI + database and Soroban contracts.
//! Uses soroban_client to verify eligibility on-chain.
//!
//! The backend NEVER signs or submits transactions. All state-changing
//! operations on the blockchain are performed by the user's Freighter wallet.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;
use tracing::{info, error};

use crate::soroban_client::SorobanClient;
use crate::AppState;

/// Check whether the maintenance record is eligible for compliance
/// by verifying both a SUPERVISOR and an AUDITOR have approved in the database.
/// Also verifies on-chain via Soroban — failure propagates as an error.
pub async fn is_eligible_for_compliance(
    db: &PgPool,
    maintenance_id: Uuid,
) -> Result<bool, StatusCode> {
    let supervisor_approved: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM approvals WHERE maintenance_id = $1 AND role = 'SUPERVISOR' AND decision = 'APPROVED'"#
    )
    .bind(maintenance_id)
    .fetch_one(db)
    .await
    .map_err(|e| {
        error!("is_eligible_for_compliance supervisor check failed: {e}");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let auditor_approved: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM approvals WHERE maintenance_id = $1 AND role = 'AUDITOR' AND decision = 'APPROVED'"#
    )
    .bind(maintenance_id)
    .fetch_one(db)
    .await
    .map_err(|e| {
        error!("is_eligible_for_compliance auditor check failed: {e}");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let db_eligible = supervisor_approved.0 > 0 && auditor_approved.0 > 0;
    if !db_eligible {
        info!(
            "maintenance_id={maintenance_id} not eligible: supervisor_approved={}, auditor_approved={}",
            supervisor_approved.0, auditor_approved.0
        );
        return Ok(false);
    }

    // Verify on-chain via Soroban (read-only simulation). Failure propagates.
    let client = SorobanClient::new();
    match client.verify_compliance(maintenance_id.as_bytes()).await {
        Ok(true) => {
            info!("maintenance_id={maintenance_id} verified on-chain");
            Ok(true)
        }
        Ok(false) => {
            info!("maintenance_id={maintenance_id} NOT verified on-chain (approval mismatch)");
            Ok(false)
        }
        Err(e) => {
            error!("maintenance_id={maintenance_id} on-chain verification failed: {e:?}");
            Err(e)
        }
    }
}

#[derive(Debug, Serialize)]
pub struct EligibilityResponse {
    pub maintenance_id: Uuid,
    pub eligible: bool,
    pub on_chain_verified: bool,
}

/// GET /compliance/eligible/:id — check if a maintenance record is eligible for compliance certification.
/// Verifies both supervisor and auditor approvals in the database and on-chain via Soroban.
pub async fn check_eligibility(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<EligibilityResponse>, (StatusCode, String)> {
    info!("check_eligibility: maintenance_id={id}");

    match is_eligible_for_compliance(&state.db, id).await {
        Ok(true) => {
            info!("maintenance_id={id} is eligible for compliance certification");
            Ok(Json(EligibilityResponse {
                maintenance_id: id,
                eligible: true,
                on_chain_verified: true,
            }))
        }
        Ok(false) => {
            info!("maintenance_id={id} is NOT eligible for compliance certification");
            Ok(Json(EligibilityResponse {
                maintenance_id: id,
                eligible: false,
                on_chain_verified: false,
            }))
        }
        Err(status) => {
            let msg = format!("eligibility check failed for maintenance_id={id}");
            error!("{msg}");
            Err((status, msg))
        }
    }
}
