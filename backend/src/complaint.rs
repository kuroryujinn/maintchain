//! Compliance verification / issuance (Decentralized implementation)
//!
//! Backend acts as a facilitator between the UI + database and Soroban contracts.
//! NOTE: This file is currently using placeholders for Soroban integration to ensure
//! the backend compiles and the API can be exercised end-to-end.

use axum::http::StatusCode;
use sqlx::PgPool;
use uuid::Uuid;

/// Check whether the maintenance record is eligible by querying the on-chain state.
pub async fn is_eligible_for_compliance(
    _db: &PgPool,
    _maintenance_id: Uuid,
) -> Result<bool, StatusCode> {
    // Placeholder: assumes eligible.
    Ok(true)
}

/// Transition record to COMPLIANT by triggering the on-chain attestation.
pub async fn transition_to_compliant(
    db: &PgPool,
    maintenance_id: Uuid,
) -> Result<(), StatusCode> {
    // 1. Verify on-chain eligibility (placeholder)
    let eligible = is_eligible_for_compliance(db, maintenance_id).await?;
    if !eligible {
        return Err(StatusCode::CONFLICT);
    }

    // 2. Issue certificate on-chain (placeholder tx id)
    let tx_id = format!("tx_placeholder_{}", uuid::Uuid::new_v4());

    // 3. Update local database as a mirror of on-chain truth
    sqlx::query(
        r#"
        update maintenance_records
        set status = 'COMPLIANT',
            tx_id = $2
        where id = $1
        "#,
    )
    .bind(maintenance_id)
    .bind(tx_id)
    .execute(db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(())
}
