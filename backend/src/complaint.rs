//! Compliance verification / issuance (Decentralized implementation)
//!
//! Backend acts as a facilitator between the UI + database and Soroban contracts.
//! Uses soroban_client to verify eligibility and issue certificates on-chain.

use axum::http::StatusCode;
use sqlx::PgPool;
use uuid::Uuid;
use sha2::{Digest, Sha256};
use tracing::{info, error};

use crate::soroban_client::SorobanClient;

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
            "maintenance_id={} not eligible: supervisor_approved={}, auditor_approved={}",
            maintenance_id, supervisor_approved.0, auditor_approved.0
        );
        return Ok(false);
    }

    // Verify on-chain via Soroban. Failure propagates — no silent fallback.
    let client = SorobanClient::new();
    match client.verify_compliance(maintenance_id.as_bytes()).await {
        Ok(true) => {
            info!("maintenance_id={} verified on-chain", maintenance_id);
            Ok(true)
        }
        Ok(false) => {
            info!("maintenance_id={} NOT verified on-chain (approval mismatch)", maintenance_id);
            Ok(false)
        }
        Err(e) => {
            error!("maintenance_id={} on-chain verification failed: {:?}", maintenance_id, e);
            Err(e)
        }
    }
}

/// Transition record to COMPLIANT by triggering the on-chain attestation.
/// Calls ComplianceAttestation.issue_certificate via the Soroban client.
/// Only updates the database AFTER the on-chain transaction confirms.
pub async fn transition_to_compliant(
    db: &PgPool,
    maintenance_id: Uuid,
) -> Result<(), StatusCode> {
    // 1. Verify on-chain eligibility
    let eligible = is_eligible_for_compliance(db, maintenance_id).await?;
    if !eligible {
        info!("maintenance_id={} not eligible for compliance", maintenance_id);
        return Err(StatusCode::CONFLICT);
    }

    // 2. Compute cert hash from maintenance_id
    let mut hasher = Sha256::new();
    hasher.update(maintenance_id.as_bytes());
    let cert_hash_bytes: [u8; 32] = hasher.finalize().into();

    // 3. Issue certificate on-chain via Soroban — this MUST succeed before DB write
    let client = SorobanClient::new();
    let id_bytes = maintenance_id.as_bytes();

    let tx_id = client
        .issue_certificate(id_bytes, &cert_hash_bytes)
        .await
        .map_err(|e| {
            error!("soroban issue_certificate failed: {:?}", e);
            StatusCode::BAD_GATEWAY
        })?;

    info!("maintenance_id={} transitioned to COMPLIANT, tx_id={}", maintenance_id, tx_id);

    // 4. Update local database AFTER on-chain confirmation
    sqlx::query(
        r#"
        update maintenance_records
        set status = 'COMPLIANT',
            tx_id = $2
        where id = $1
        "#,
    )
    .bind(maintenance_id)
    .bind(&tx_id)
    .execute(db)
    .await
    .map_err(|e| {
        error!("maintenance_id={} DB update after on-chain success failed: {e}", maintenance_id);
        // On-chain tx already confirmed — queue a recovery job
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(())
}
