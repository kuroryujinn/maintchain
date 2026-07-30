//! Soroban RPC client for reading smart contract state from the backend.
//!
//! The backend is **verify-only** — it never signs or submits transactions.
//! All state-changing operations are initiated by the user's Freighter wallet
//! through the frontend. The backend only:
//!
//!   1. **Simulates** read-only contract calls via native Rust RPC (soroban_rpc)
//!   2. **Verifies** transaction hashes submitted by the frontend
//!   3. **Reads** contract state after confirmation to sync the database
//!
//! No deployer secret key is used. No transactions are signed on the backend.
//! No Node.js subprocess is spawned — all RPC calls are native Rust.

use axum::{extract::Path, http::StatusCode, Json};
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::soroban_rpc;

/// Soroban RPC client wrapper — verify-only, no signing.
pub struct SorobanClient;

impl SorobanClient {
    pub fn new() -> Self {
        Self
    }

    /// Get the configured contract IDs from environment.
    pub fn approval_contract_id() -> String {
        std::env::var("APPROVAL_CONTRACT_ID").unwrap_or_default()
    }

    pub fn records_contract_id() -> String {
        std::env::var("RECORDS_CONTRACT_ID").unwrap_or_default()
    }

    pub fn attestation_contract_id() -> String {
        std::env::var("ATTESTATION_CONTRACT_ID").unwrap_or_default()
    }

    /// Verify compliance by simulating `MultiPartyApproval.verify()` on-chain.
    ///
    /// Uses native Rust RPC (no Node.js subprocess). Decodes the ScVal boolean
    /// return value using `stellar-xdr` instead of fragile hex string matching.
    pub async fn verify_compliance(
        &self,
        maintenance_id_bytes: &[u8],
    ) -> Result<bool, StatusCode> {
        let approval_contract = Self::approval_contract_id();
        if approval_contract.is_empty() {
            error!("soroban_client: APPROVAL_CONTRACT_ID not configured");
            return Err(StatusCode::FAILED_DEPENDENCY);
        }

        let contract_id = soroban_rpc::parse_contract_id(&approval_contract).map_err(|e| {
            error!("soroban_client: invalid APPROVAL_CONTRACT_ID: {e}");
            StatusCode::FAILED_DEPENDENCY
        })?;

        // Build the ScVal argument: maintenance ID as zero-extended 32-byte Bytes
        let id_32 = soroban_rpc::zero_extend_32(maintenance_id_bytes);
        let args = vec![soroban_rpc::scval_bytes(&id_32)];

        let id_hex = hex::encode(id_32);
        info!("soroban_client: verify_compliance for maintenance_id=0x{id_hex}");

        let result = soroban_rpc::simulate_contract_call(&contract_id, "verify", args)
            .await
            .map_err(|e| {
                warn!("soroban_client: verify_compliance simulation failed");
                e
            })?;

        if !result.success {
            let err = result.error.unwrap_or_else(|| "unknown error".to_string());
            error!("soroban_client: verify_compliance failed: {err}");
            return Err(StatusCode::BAD_GATEWAY);
        }

        // Decode the boolean return value using proper ScVal XDR parsing
        match result.retval {
            Some(retval) => {
                let is_compliant = soroban_rpc::decode_retval_bool(&retval)?;
                info!("soroban_client: verify_compliance returned {is_compliant}");
                Ok(is_compliant)
            }
            None => {
                error!("soroban_client: verify_compliance returned no retval");
                Err(StatusCode::BAD_GATEWAY)
            }
        }
    }

    /// Read attestation state from the ComplianceAttestation contract (read-only).
    pub async fn get_attestation(
        &self,
        maintenance_id_bytes: &[u8],
    ) -> Result<serde_json::Value, StatusCode> {
        let attestation_contract = Self::attestation_contract_id();
        if attestation_contract.is_empty() {
            error!("soroban_client: ATTESTATION_CONTRACT_ID not configured");
            return Err(StatusCode::FAILED_DEPENDENCY);
        }

        let contract_id =
            soroban_rpc::parse_contract_id(&attestation_contract).map_err(|e| {
                error!("soroban_client: invalid ATTESTATION_CONTRACT_ID: {e}");
                StatusCode::FAILED_DEPENDENCY
            })?;

        let id_32 = soroban_rpc::zero_extend_32(maintenance_id_bytes);
        let args = vec![soroban_rpc::scval_bytes(&id_32)];

        let result = soroban_rpc::simulate_contract_call(&contract_id, "get_attestation", args)
            .await?;

        if !result.success {
            let err = result.error.unwrap_or_else(|| "unknown error".to_string());
            error!("soroban_client: get_attestation failed: {err}");
            return Err(StatusCode::BAD_GATEWAY);
        }

        Ok(result.raw)
    }

    /// Read a maintenance record from the MaintenanceRecords contract (read-only).
    pub async fn get_maintenance_record(
        &self,
        maintenance_id_bytes: &[u8],
    ) -> Result<serde_json::Value, StatusCode> {
        let records_contract = Self::records_contract_id();
        if records_contract.is_empty() {
            error!("soroban_client: RECORDS_CONTRACT_ID not configured");
            return Err(StatusCode::FAILED_DEPENDENCY);
        }

        let contract_id = soroban_rpc::parse_contract_id(&records_contract).map_err(|e| {
            error!("soroban_client: invalid RECORDS_CONTRACT_ID: {e}");
            StatusCode::FAILED_DEPENDENCY
        })?;

        let id_32 = soroban_rpc::zero_extend_32(maintenance_id_bytes);
        let args = vec![soroban_rpc::scval_bytes(&id_32)];

        let result =
            soroban_rpc::simulate_contract_call(&contract_id, "get_record", args).await?;

        if !result.success {
            let err = result.error.unwrap_or_else(|| "unknown error".to_string());
            error!("soroban_client: get_maintenance_record failed: {err}");
            return Err(StatusCode::BAD_GATEWAY);
        }

        Ok(result.raw)
    }

    /// Verify a transaction hash on the Soroban network.
    ///
    /// Checks that the transaction:
    ///   - exists
    ///   - succeeded
    ///   - optionally matches the expected source address
    pub async fn verify_transaction(
        &self,
        tx_hash: &str,
        expected_source: &str,
    ) -> Result<bool, StatusCode> {
        let value = soroban_rpc::get_transaction(tx_hash).await?;

        // Extract result from JSON-RPC response
        let result = &value["result"];

        let status = result["status"].as_str().unwrap_or("UNKNOWN");
        if status != "SUCCESS" {
            info!("soroban_client: verify_transaction status = {status}");
            return Ok(false);
        }

        // Optional: verify source account matches expected (skip if empty)
        if !expected_source.is_empty() {
            if let Some(source) = result["source"].as_str() {
                if source != expected_source {
                    warn!(
                        "soroban_client: verify_transaction source mismatch: \
                         expected {expected_source}, got {source}"
                    );
                    return Ok(false);
                }
            }
        }

        Ok(true)
    }
}

// ── API Handlers ──

/// GET /compliance/attestation/:id — read attestation state from the ComplianceAttestation contract.
pub async fn get_onchain_attestation(
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let client = SorobanClient::new();
    info!("GET /compliance/attestation/{id}");
    client
        .get_attestation(id.as_bytes())
        .await
        .map(Json)
        .map_err(|code| (code, "on-chain attestation read failed".to_string()))
}

/// GET /onchain/record/:id — read a maintenance record from the MaintenanceRecords contract.
pub async fn get_onchain_record(
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let client = SorobanClient::new();
    info!("GET /onchain/record/{id}");
    client
        .get_maintenance_record(id.as_bytes())
        .await
        .map(Json)
        .map_err(|code| (code, "on-chain record read failed".to_string()))
}
