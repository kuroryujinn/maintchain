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

/// Check whether the maintenance record is eligible by querying the on-chain state.
/// Uses the Soroban client to call MultiPartyApproval.verify_compliance.
pub async fn is_eligible_for_compliance(
    _db: &PgPool,
    maintenance_id: Uuid,
) -> Result<bool, StatusCode> {
    let client = SorobanClient::new();
    // Uuid::as_bytes() returns &[u8; 16]; soroban_client accepts &[u8] and zero-extends
    let id_bytes = maintenance_id.as_bytes();

    client
        .verify_compliance(id_bytes)
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY)
}

/// Transition record to COMPLIANT by triggering the on-chain attestation.
/// Calls ComplianceAttestation.issue_certificate via the Soroban client.
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

    // 3. Issue certificate on-chain via Soroban
    let client = SorobanClient::new();
    // Uuid::as_bytes() returns &[u8; 16]; soroban_client accepts &[u8] and zero-extends
    let id_bytes = maintenance_id.as_bytes();

    let tx_id = client
        .issue_certificate(id_bytes, &cert_hash_bytes)
        .await
        .map_err(|e| {
            error!("soroban issue_certificate failed: {:?}", e);
            StatusCode::BAD_GATEWAY
        })?;

    info!("maintenance_id={} transitioned to COMPLIANT, tx_id={}", maintenance_id, tx_id);

    // 4. Update local database as a mirror of on-chain truth
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
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(())
}
