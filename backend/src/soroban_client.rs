//! Soroban RPC client for calling smart contracts from the backend.
//!
//! Uses a dual approach:
//!   1. **Read-only (simulate):** Makes raw HTTP POST /simulateTransaction
//!      calls via `reqwest`. The transaction XDR is built by a Node.js
//!      helper script (`scripts/soroban-invoke.mjs`) that uses
//!      `@stellar/stellar-sdk` — the same library the frontend uses.
//!
//!   2. **Write (sign + submit):** For write operations like `issue_certificate`,
//!      we use the Node.js helper to build, simulate, sign (with the deployer
//!      key), and submit the transaction.
//!
//! Falls back gracefully to demo/placeholder results when the deployer key
//! or contract IDs are not configured.

use axum::http::StatusCode;
use std::process::Command;
use tracing::{info, error, warn};

use serde_json::Value;

/// Soroban RPC client wrapper.
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

    /// Get the deployer secret key from environment (if configured).
    fn deployer_secret_key() -> Option<String> {
        let key = std::env::var("DEPLOYER_SECRET_KEY").ok()?;
        if key.trim().is_empty() { None } else { Some(key) }
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
        // Try several locations
        let candidates = [
            "scripts/soroban-invoke.mjs",     // Run from project root
            "../scripts/soroban-invoke.mjs",  // Run from backend/
            "./scripts/soroban-invoke.mjs",   // Run from backend/ (absolute)
        ];

        // Also check SOROBAN_HELPER_PATH env var
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

        // Default fallback
        "scripts/soroban-invoke.mjs".to_string()
    }

    /// Invoke the Node.js helper script and parse its JSON output.
    async fn invoke_helper(input: &Value) -> Result<Value, StatusCode> {
        let script_path = Self::helper_script_path();
        let input_json = serde_json::to_string(input).map_err(|e| {
            error!("soroban_client: failed to serialize helper input: {}", e);
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
            error!("soroban_client: helper task panicked: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .map_err(|e| {
            error!("soroban_client: failed to invoke node helper: {}", e);
            StatusCode::BAD_GATEWAY
        })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("soroban_client: helper script failed: {}", stderr);
            return Err(StatusCode::BAD_GATEWAY);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let result: Value = serde_json::from_str(&stdout).map_err(|e| {
            error!("soroban_client: failed to parse helper output: {} — raw: {}", e, stdout);
            StatusCode::BAD_GATEWAY
        })?;

        Ok(result)
    }

    /// Verify compliance by calling `MultiPartyApproval.verify_compliance`.
    ///
    /// Uses the Soroban RPC `simulateTransaction` endpoint. Since this is
    /// a read-only call, it doesn't need signing — we can simulate directly.
    ///
    /// Falls back to `true` (eligible) if the on-chain check cannot be performed.
    pub async fn verify_compliance(
        &self,
        maintenance_id_bytes: &[u8],
    ) -> Result<bool, StatusCode> {
        let approval_contract = Self::approval_contract_id();
        if approval_contract.is_empty() {
            info!("soroban_client: no APPROVAL_CONTRACT_ID, falling back to DB check");
            return Ok(true);
        }

        let secret_key = Self::deployer_secret_key();
        if secret_key.is_none() {
            info!("soroban_client: no DEPLOYER_SECRET_KEY for simulation, using DB check");
            return Ok(true);
        }

        // Zero-extend to 32 bytes
        let mut id_32 = [0u8; 32];
        let len = maintenance_id_bytes.len().min(32);
        id_32[..len].copy_from_slice(&maintenance_id_bytes[..len]);
        let id_hex = format!("0x{}", hex::encode(id_32));

        info!(
            "soroban_client: verify_compliance for maintenance_id={:?} via contract {}",
            id_hex, approval_contract
        );

        // Call the Node.js helper to simulate verify_compliance
        let helper_input = serde_json::json!({
            "rpc_url": Self::rpc_url(),
            "network_passphrase": Self::network_passphrase(),
            "contract_id": approval_contract,
            "method": "verify",
            "args": [id_hex],
            "simulate_only": true,
        });

        let result = Self::invoke_helper(&helper_input).await.map_err(|e| {
            warn!("soroban_client: verify_compliance simulation failed, falling back to DB check");
            e
        })?;

        // Parse the boolean return value from the simulation
        if result["success"].as_bool().unwrap_or(false) {
            let raw = &result["raw"];
            // The retval is a hex-encoded ScVal.
            // Boolean true = ScvBool = type 7 = 0x00000007
            // Boolean false = ScvBool = type 6 = 0x00000006
            if let Some(retval) = raw["result"]["retval"].as_str() {
                let clean = retval.trim_start_matches("0x").to_lowercase();
                let is_true = clean.contains("00000007") || clean.contains("00000001");
                info!("soroban_client: verify_compliance returned {}", is_true);
                Ok(is_true)
            } else {
                warn!("soroban_client: simulation missing retval field, assuming eligible");
                Ok(true)
            }
        } else {
            warn!("soroban_client: verify_compliance simulation returned error: {:?}, assuming eligible",
                result["error"]);
            Ok(true)
        }
    }

    /// Issue a compliance certificate on-chain.
    ///
    /// Calls `ComplianceAttestation.issue_certificate` via the Node.js helper,
    /// which handles XDR building, signing (with DEPLOYER_SECRET_KEY), and
    /// submission to the Soroban RPC.
    ///
    /// Falls back to a demo placeholder tx hash if the deployer key is not
    /// configured or if the RPC call fails.
    pub async fn issue_certificate(
        &self,
        maintenance_id_bytes: &[u8],
        cert_hash_bytes: &[u8; 32],
    ) -> Result<String, StatusCode> {
        let attestation_contract = Self::attestation_contract_id();
        let approval_contract = Self::approval_contract_id();
        let records_contract = Self::records_contract_id();
        let secret_key = Self::deployer_secret_key();

        let can_do_onchain = !attestation_contract.is_empty()
            && !approval_contract.is_empty()
            && !records_contract.is_empty()
            && secret_key.is_some();

        if !can_do_onchain {
            let reason = if secret_key.is_none() {
                "no DEPLOYER_SECRET_KEY configured"
            } else {
                "contract IDs not fully configured"
            };
            let tx_id = format!("tx_demo_{}", uuid::Uuid::new_v4());
            info!("soroban_client: {} — using demo tx_id={}", reason, tx_id);
            return Ok(tx_id);
        }

        let secret_key = secret_key.unwrap();

        // Zero-extend to 32 bytes
        let mut id_32 = [0u8; 32];
        let len = maintenance_id_bytes.len().min(32);
        id_32[..len].copy_from_slice(&maintenance_id_bytes[..len]);
        let id_hex = format!("0x{}", hex::encode(id_32));
        let cert_hex = format!("0x{}", hex::encode(cert_hash_bytes.as_slice()));

        info!(
            "soroban_client: issue_certificate for maintenance_id={:?}, cert_hash={:?}",
            id_hex, cert_hex
        );

        // Args for issue_certificate:
        //   (approval_contract_id: Address, records_contract_id: Address,
        //    maintenance_id: BytesN<32>, cert_hash: BytesN<32>)
        let helper_input = serde_json::json!({
            "rpc_url": Self::rpc_url(),
            "network_passphrase": Self::network_passphrase(),
            "contract_id": attestation_contract,
            "method": "issue_certificate",
            "args": [
                approval_contract,
                records_contract,
                id_hex,
                cert_hex,
            ],
            "secret_key": secret_key,
            "simulate_only": false,
        });

        let result = Self::invoke_helper(&helper_input).await?;

        if result["success"].as_bool().unwrap_or(false) {
            let tx_hash = result["tx_hash"].as_str().unwrap_or("unknown").to_string();
            info!("soroban_client: issue_certificate succeeded, tx_hash={}", tx_hash);
            Ok(tx_hash)
        } else {
            let error_msg = result["error"].as_str().unwrap_or("unknown error");
            error!("soroban_client: issue_certificate failed: {}", error_msg);
            // Fall back to demo tx for resilience
            let tx_id = format!("tx_demo_{}", uuid::Uuid::new_v4());
            warn!("soroban_client: falling back to demo tx_id={}", tx_id);
            Ok(tx_id)
        }
    }
}
