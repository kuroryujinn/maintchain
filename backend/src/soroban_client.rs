//! Soroban RPC client for reading smart contract state from the backend.
//!
//! The backend is now **verify-only** — it never signs or submits transactions.
//! All state-changing operations are initiated by the user's Freighter wallet
//! through the frontend. The backend only:
//!
//!   1. **Simulates** read-only contract calls via Node.js helper
//!   2. **Verifies** transaction hashes submitted by the frontend
//!   3. **Reads** contract state after confirmation to sync the database
//!
//! No deployer secret key is used. No transactions are signed on the backend.

use axum::{
    extract::Path,
    http::StatusCode,
    Json,
};
use std::process::Command;
use tracing::{info, error, warn};
use uuid::Uuid;

use serde_json::Value;

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

    /// Get the Soroban RPC URL from environment.
    fn rpc_url() -> String {
        std::env::var("SOROBAN_RPC_URL")
            .unwrap_or_else(|_| "https://soroban-testnet.stellar.org".to_string())
    }

    /// Get the network passphrase from environment.
    fn network_passphrase() -> String {
        std::env::var("SOROBAN_NETWORK_PASSPHRASE")
            .unwrap_or_else(|_| "Test SDF Network ; September 2015".to_string())
    }

    /// Find the path to the Node.js helper script.
    fn helper_script_path() -> String {
        let candidates = [
            "scripts/soroban-invoke.mjs",
            "../scripts/soroban-invoke.mjs",
            "./scripts/soroban-invoke.mjs",
        ];

        if let Ok(path) = std::env::var("SOROBAN_HELPER_PATH") {
            if !path.is_empty() {
                return path;
            }
        }

        for candidate in &candidates {
            if std::path::Path::new(candidate).exists() {
                return candidate.to_string();
            }
        }

        "scripts/soroban-invoke.mjs".to_string()
    }

    /// Invoke the Node.js helper script for a simulate-only call.
    async fn simulate_via_helper(input: &Value) -> Result<Value, StatusCode> {
        let script_path = Self::helper_script_path();
        let input_json = serde_json::to_string(input).map_err(|e| {
            error!("soroban_client: failed to serialize helper input: {e}");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        let output = tokio::task::spawn_blocking(move || {
            Command::new("node")
                .arg(&script_path)
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
                .and_then(|mut child| {
                    use std::io::Write;
                    if let Some(ref mut stdin) = child.stdin {
                        stdin.write_all(input_json.as_bytes())?;
                    }
                    child.wait_with_output()
                })
        })
        .await
        .map_err(|e| {
            error!("soroban_client: helper task panicked: {e}");
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .map_err(|e| {
            error!("soroban_client: failed to invoke node helper: {e}");
            StatusCode::BAD_GATEWAY
        })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("soroban_client: helper script failed: {stderr}");
            return Err(StatusCode::BAD_GATEWAY);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let result: Value = serde_json::from_str(&stdout).map_err(|e| {
            error!("soroban_client: failed to parse helper output: {e} — raw: {stdout}");
            StatusCode::BAD_GATEWAY
        })?;

        Ok(result)
    }

    /// Verify compliance by simulating `MultiPartyApproval.verify_compliance`.
    ///
    /// This is a read-only contract call — no signing needed.
    /// Returns an error if the on-chain check cannot be performed.
    pub async fn verify_compliance(
        &self,
        maintenance_id_bytes: &[u8],
    ) -> Result<bool, StatusCode> {
        let approval_contract = Self::approval_contract_id();
        if approval_contract.is_empty() {
            error!("soroban_client: APPROVAL_CONTRACT_ID not configured");
            return Err(StatusCode::FAILED_DEPENDENCY);
        }

        // Zero-extend to 32 bytes
        let mut id_32 = [0u8; 32];
        let len = maintenance_id_bytes.len().min(32);
        id_32[..len].copy_from_slice(&maintenance_id_bytes[..len]);
        let id_hex = format!("0x{}", hex::encode(id_32));

        info!(
            "soroban_client: verify_compliance for maintenance_id={id_hex:?} via contract {approval_contract}"
        );

        let helper_input = serde_json::json!({
            "rpc_url": Self::rpc_url(),
            "network_passphrase": Self::network_passphrase(),
            "contract_id": approval_contract,
            "method": "verify",
            "args": [id_hex],
            "simulate_only": true,
        });

        let result = Self::simulate_via_helper(&helper_input).await.map_err(|e| {
            warn!("soroban_client: verify_compliance simulation failed");
            e
        })?;

        let success = result["success"].as_bool().ok_or_else(|| {
            error!("soroban_client: verify_compliance response missing 'success' field");
            StatusCode::BAD_GATEWAY
        })?;

        if !success {
            let err = result["error"].as_str().unwrap_or("unknown simulation error");
            error!("soroban_client: verify_compliance simulation failed: {err}");
            return Err(StatusCode::BAD_GATEWAY);
        }

        let raw = &result["raw"];
        let retval = raw["result"]["retval"].as_str().ok_or_else(|| {
            error!("soroban_client: verify_compliance simulation succeeded but missing retval");
            StatusCode::BAD_GATEWAY
        })?;

        // Parse boolean return value from hex-encoded ScVal
        let clean = retval.trim_start_matches("0x").to_lowercase();
        let is_true = clean.contains("00000007") || clean.contains("00000001");
        info!("soroban_client: verify_compliance returned {is_true}");
        Ok(is_true)
    }

    /// Read attestation state from the ComplianceAttestation contract (read-only).
    ///
    /// After a user submits and confirms a certificate issuance via their wallet,
    /// the backend calls this to read the on-chain attestation state.
    pub async fn get_attestation(
        &self,
        maintenance_id_bytes: &[u8],
    ) -> Result<Value, StatusCode> {
        let attestation_contract = Self::attestation_contract_id();
        if attestation_contract.is_empty() {
            error!("soroban_client: ATTESTATION_CONTRACT_ID not configured");
            return Err(StatusCode::FAILED_DEPENDENCY);
        }

        let mut id_32 = [0u8; 32];
        let len = maintenance_id_bytes.len().min(32);
        id_32[..len].copy_from_slice(&maintenance_id_bytes[..len]);
        let id_hex = format!("0x{}", hex::encode(id_32));

        let helper_input = serde_json::json!({
            "rpc_url": Self::rpc_url(),
            "network_passphrase": Self::network_passphrase(),
            "contract_id": attestation_contract,
            "method": "get_attestation",
            "args": [id_hex],
            "simulate_only": true,
        });

        let result = Self::simulate_via_helper(&helper_input).await?;

        Ok(result)
    }

    /// Read a maintenance record from the MaintenanceRecords contract (read-only).
    pub async fn get_maintenance_record(
        &self,
        maintenance_id_bytes: &[u8],
    ) -> Result<Value, StatusCode> {
        let records_contract = Self::records_contract_id();
        if records_contract.is_empty() {
            error!("soroban_client: RECORDS_CONTRACT_ID not configured");
            return Err(StatusCode::FAILED_DEPENDENCY);
        }

        let mut id_32 = [0u8; 32];
        let len = maintenance_id_bytes.len().min(32);
        id_32[..len].copy_from_slice(&maintenance_id_bytes[..len]);
        let id_hex = format!("0x{}", hex::encode(id_32));

        let helper_input = serde_json::json!({
            "rpc_url": Self::rpc_url(),
            "network_passphrase": Self::network_passphrase(),
            "contract_id": records_contract,
            "method": "get_record",
            "args": [id_hex],
            "simulate_only": true,
        });

        let result = Self::simulate_via_helper(&helper_input).await?;

        Ok(result)
    }

    /// Verify a transaction hash on the Soroban network.
    ///
    /// Checks that the transaction:
    ///   - exists
    ///   - succeeded
    ///   - optionally matches the expected source address
    ///
    /// If `expected_source` is empty, the source check is skipped.
    /// This is used before syncing database state after a user-initiated transaction.
    pub async fn verify_transaction(
        &self,
        tx_hash: &str,
        expected_source: &str,
    ) -> Result<bool, StatusCode> {
        let rpc_url = Self::rpc_url();
        // Transaction hashes are hex strings (0-9a-f), no special URL encoding needed
        let res = reqwest::Client::new()
            .get(format!("{rpc_url}/getTransaction/{}", tx_hash))
            .send()
            .await
            .map_err(|e| {
                error!("soroban_client: verify_transaction RPC call failed: {e}");
                StatusCode::BAD_GATEWAY
            })?;

        if !res.status().is_success() {
            warn!("soroban_client: verify_transaction not found (status {})", res.status());
            return Ok(false);
        }

        let tx_info: Value = res.json().await.map_err(|e| {
            error!("soroban_client: verify_transaction JSON parse failed: {e}");
            StatusCode::BAD_GATEWAY
        })?;

        let status = tx_info["status"].as_str().unwrap_or("UNKNOWN");
        if status != "SUCCESS" {
            info!("soroban_client: verify_transaction status = {status}");
            return Ok(false);
        }

        // Optional: verify source account matches expected (skip if empty)
        if !expected_source.is_empty() {
            if let Some(source) = tx_info["source"].as_str() {
                if source != expected_source {
                    warn!(
                        "soroban_client: verify_transaction source mismatch: expected {expected_source}, got {source}"
                    );
                    return Ok(false);
                }
            }
        }

        Ok(true)
    }
}

// ── Ed25519 Signature Verification ──
// These functions are used by the auth module for challenge-response verification.

/// Verify an ed25519 signature using the Stellar public key (G... address).
pub fn verify_ed25519_signature(
    stellar_address: &str,
    message: &[u8],
    signature_b64: &str,
) -> Result<bool, StatusCode> {
    use stellar_strkey::Strkey;
    use ed25519_dalek::{Verifier, VerifyingKey};

    let strkey = Strkey::from_string(stellar_address).map_err(|e| {
        error!("soroban_client: invalid stellar address: {e}");
        StatusCode::BAD_REQUEST
    })?;

    let pub_key_bytes = match strkey {
        Strkey::PublicKeyEd25519(pk) => pk.0,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    use base64::Engine as _;
    let sig_bytes = base64::engine::general_purpose::STANDARD.decode(signature_b64).map_err(|e| {
        error!("soroban_client: invalid signature base64: {e}");
        StatusCode::BAD_REQUEST
    })?;

    let verifying_key = VerifyingKey::from_bytes(&pub_key_bytes).map_err(|e| {
        error!("soroban_client: invalid public key: {e}");
        StatusCode::BAD_REQUEST
    })?;

    let signature = ed25519_dalek::Signature::from_slice(&sig_bytes).map_err(|e| {
        error!("soroban_client: invalid signature bytes: {e}");
        StatusCode::BAD_REQUEST
    })?;

    Ok(verifying_key.verify(message, &signature).is_ok())
}

/// Generate a session token for a verified wallet.
pub fn generate_session_token(stellar_address: &str, nonce: &str) -> String {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    let server_secret = std::env::var("AUTH_SECRET")
        .unwrap_or_else(|_| "maintchain-dev-secret".to_string());

    let mut mac = Hmac::<Sha256>::new_from_slice(server_secret.as_bytes())
        .expect("HMAC key");
    mac.update(stellar_address.as_bytes());
    mac.update(nonce.as_bytes());
    mac.update(b"MaintChainSession");

    let result = mac.finalize();
    let code_bytes = result.into_bytes();
    hex::encode(code_bytes)
}

// ── API Handlers ──

/// GET /compliance/attestation/:id — read attestation state from the ComplianceAttestation contract.
/// A read-only Soroban simulation — no signing needed.
pub async fn get_onchain_attestation(
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let client = SorobanClient::new();
    info!("GET /compliance/attestation/{id}");
    client
        .get_attestation(id.as_bytes())
        .await
        .map(Json)
        .map_err(|code| (code, "on-chain attestation read failed".to_string()))
}

/// GET /onchain/record/:id — read a maintenance record from the MaintenanceRecords contract.
/// A read-only Soroban simulation — no signing needed.
pub async fn get_onchain_record(
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let client = SorobanClient::new();
    info!("GET /onchain/record/{id}");
    client
        .get_maintenance_record(id.as_bytes())
        .await
        .map(Json)
        .map_err(|code| (code, "on-chain record read failed".to_string()))
}
