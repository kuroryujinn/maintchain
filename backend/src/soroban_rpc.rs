//! Native Rust Soroban RPC client — replaces the Node.js subprocess helper.
//!
//! Builds minimal transaction envelopes for `simulateTransaction` calls,
//! decodes ScVal return values using `stellar-xdr` instead of fragile hex
//! string matching, and reuses a single `reqwest::Client` for all HTTP calls.
//!
//! The backend is **verify-only** — it never signs or submits transactions.
//! All state-changing operations are initiated by the user's Freighter wallet.

use axum::http::StatusCode;
use base64::Engine;
use reqwest::Client;
use serde_json::{json, Value};
use stellar_xdr::curr::{
    Hash, HostFunction, InvokeContractArgs, InvokeHostFunctionOp, Limits,
    Memo, MuxedAccount, Operation, OperationBody, Preconditions, ReadXdr, ScAddress, ScBytes,
    ScSymbol, ScVal, SequenceNumber, Transaction, TransactionEnvelope, TransactionExt,
    TransactionV1Envelope, Uint256, VecM, WriteXdr,
};
use std::sync::OnceLock;
use tracing::{error, info, warn};

// ── Reusable HTTP Client ──────────────────────────────────────────────

fn http_client() -> &'static Client {
    static CLIENT: OnceLock<Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("reqwest Client should build")
    })
}

// ── Configuration Helpers ─────────────────────────────────────────────

fn rpc_url() -> String {
    std::env::var("SOROBAN_RPC_URL")
        .unwrap_or_else(|_| "https://soroban-testnet.stellar.org".to_string())
}

// ── Contract ID Parsing ───────────────────────────────────────────────

/// Parse a contract ID from hex (0x...) into a 32-byte array.
pub fn parse_contract_id(id: &str) -> Result<[u8; 32], String> {
    let hex = id.strip_prefix("0x").unwrap_or(id);
    let bytes = hex::decode(hex).map_err(|e| format!("invalid contract ID hex: {e}"))?;
    if bytes.len() != 32 {
        return Err(format!("contract ID must be 32 bytes, got {}", bytes.len()));
    }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

/// Zero-extend arbitrary bytes to 32 bytes (used for maintenance IDs, etc.).
pub fn zero_extend_32(src: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    let len = src.len().min(32);
    out[..len].copy_from_slice(&src[..len]);
    out
}

// ── ScVal Argument Helpers ────────────────────────────────────────────

/// Create an ScVal::Bytes from raw bytes.
pub fn scval_bytes(data: &[u8]) -> ScVal {
    let scbytes = ScBytes::try_from(data.to_vec())
        .expect("ScBytes construction should not fail for data <= max length");
    ScVal::Bytes(scbytes)
}

// ── Transaction XDR Builder ───────────────────────────────────────────

/// Build a minimal transaction envelope XDR for simulating a contract call.
///
/// Returns base64-encoded XDR suitable for `simulateTransaction`.
///
/// The transaction uses a dummy source account and zero sequence number
/// because it is never submitted — only simulated.
fn build_simulation_envelope(
    contract_id: &[u8; 32],
    method: &str,
    args: Vec<ScVal>,
) -> Result<String, String> {
    let contract_hash = Hash(*contract_id);

    // Build the host function arguments
    let invoke_args = InvokeContractArgs {
        contract_address: ScAddress::Contract(contract_hash),
        function_name: ScSymbol(method.to_string().try_into()
            .map_err(|e| format!("ScSymbol string too long: {e}"))?),
        args: args.try_into()
            .map_err(|e| format!("VecM<ScVal> conversion: {e}"))?,
    };

    let host_fn = HostFunction::InvokeContract(invoke_args);

    let invoke_host_fn_op = InvokeHostFunctionOp {
        host_function: host_fn,
        auth: VecM::default(),
    };

    let op_body = OperationBody::InvokeHostFunction(invoke_host_fn_op);

    let op = Operation {
        source_account: None,
        body: op_body,
    };

    // Dummy source account — never submitted, only simulated
    let source = MuxedAccount::Ed25519(Uint256([0u8; 32]));

    let tx = Transaction {
        source_account: source,
        fee: 100,
        seq_num: SequenceNumber(0),
        cond: Preconditions::None,
        memo: Memo::None,
        operations: vec![op].try_into()
            .map_err(|e| format!("VecM<Operation> conversion: {e}"))?,
        ext: TransactionExt::V0,
    };

    let envelope = TransactionEnvelope::Tx(TransactionV1Envelope {
        tx,
        signatures: VecM::default(),
    });

    let xdr_bytes = envelope
        .to_xdr(Limits::none())
        .map_err(|e| format!("XDR serialization: {e}"))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(&xdr_bytes))
}

// ── ScVal Decoding ────────────────────────────────────────────────────

/// Decode a hex-encoded `retval` string (from `simulateTransaction` response)
/// into a proper ScVal, then extract the boolean value.
///
/// This replaces the fragile check:
///   `clean.contains("00000007") || clean.contains("00000001")`
/// which was unreliable because both true and false ScVal contain `00000007`
/// (the ScValType discriminant), so false would incorrectly return true.
pub fn decode_retval_bool(retval_hex: &str) -> Result<bool, StatusCode> {
    if retval_hex.is_empty() {
        error!("soroban_rpc: retval hex string is empty");
        return Err(StatusCode::BAD_GATEWAY);
    }

    let clean = retval_hex.trim_start_matches("0x");
    if clean.is_empty() {
        error!("soroban_rpc: retval hex is only '0x' prefix — no value");
        return Err(StatusCode::BAD_GATEWAY);
    }

    let bytes = hex::decode(clean).map_err(|e| {
        error!("soroban_rpc: failed to decode retval hex '{retval_hex}': {e}");
        StatusCode::BAD_GATEWAY
    })?;

    let scval = ScVal::from_xdr(&bytes, Limits::none()).map_err(|e| {
        error!("soroban_rpc: failed to decode ScVal from retval ({} bytes): {e}", bytes.len());
        StatusCode::BAD_GATEWAY
    })?;

    match scval {
        ScVal::Bool(true) => {
            info!("soroban_rpc: decoded retval → ScVal::Bool(true)");
            Ok(true)
        }
        ScVal::Bool(false) => {
            info!("soroban_rpc: decoded retval → ScVal::Bool(false)");
            Ok(false)
        }
        other => {
            warn!(
                "soroban_rpc: unexpected ScVal type for boolean: {:?}",
                other
            );
            Ok(false) // Treat non-boolean ScVal as false
        }
    }
}

// ── Result Types ──────────────────────────────────────────────────────

/// Result of a `simulateTransaction` call.
pub struct SimulateResult {
    pub success: bool,
    /// Hex-encoded ScVal XDR of the return value (if simulation succeeded).
    pub retval: Option<String>,
    pub error: Option<String>,
    pub raw: Value,
}

// ── RPC Call ──────────────────────────────────────────────────────────

/// Call `simulateTransaction` on the Soroban RPC endpoint.
///
/// Builds a minimal transaction envelope with the given contract invocation,
/// sends it to the RPC server, and returns the parsed result.
pub async fn simulate_contract_call(
    contract_id: &[u8; 32],
    method: &str,
    args: Vec<ScVal>,
) -> Result<SimulateResult, StatusCode> {
    let url = rpc_url();
    let rpc_endpoint = format!("{}/simulateTransaction", url.trim_end_matches('/'));

    let contract_hex = hex::encode(contract_id);
    info!("soroban_rpc: simulate {contract_hex}/{method} via {rpc_endpoint}");

    let tx_xdr = build_simulation_envelope(contract_id, method, args).map_err(|e| {
        error!("soroban_rpc: failed to build tx XDR: {e}");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let body = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "simulateTransaction",
        "params": {
            "transaction": tx_xdr
        }
    });

    let resp = http_client()
        .post(&rpc_endpoint)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            error!("soroban_rpc: HTTP request failed: {e}");
            StatusCode::BAD_GATEWAY
        })?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        error!("soroban_rpc: RPC returned {status}: {text}");
        return Err(StatusCode::BAD_GATEWAY);
    }

    let value: Value = resp.json().await.map_err(|e| {
        error!("soroban_rpc: failed to parse response JSON: {e}");
        StatusCode::BAD_GATEWAY
    })?;

    // Check JSON-RPC-level error
    if let Some(err) = value.get("error") {
        let code = err["code"].as_i64().unwrap_or(-1);
        let msg = err["message"].as_str().unwrap_or("unknown RPC error");
        error!("soroban_rpc: JSON-RPC error ({code}): {msg}");
        return Ok(SimulateResult {
            success: false,
            retval: None,
            error: Some(format!("RPC error ({code}): {msg}")),
            raw: value,
        });
    }

    // Extract the result object
    let result = &value["result"];

    // Check simulation-level error
    if let Some(err) = result.get("error") {
        let msg = err.as_str().unwrap_or("unknown simulation error");
        error!("soroban_rpc: simulation error: {msg}");
        return Ok(SimulateResult {
            success: false,
            retval: None,
            error: Some(msg.to_string()),
            raw: value,
        });
    }

    // Extract retval (hex-encoded ScVal XDR)
    let retval = result["retval"].as_str().map(|s| s.to_string());

    if retval.is_none() {
        warn!("soroban_rpc: no 'retval' field in simulation response — no return value");
    }

    info!("soroban_rpc: simulation succeeded");
    Ok(SimulateResult {
        success: true,
        retval,
        error: None,
        raw: value,
    })
}

/// Verify a transaction hash via the Soroban RPC `getTransaction` endpoint.
pub async fn get_transaction(tx_hash: &str) -> Result<Value, StatusCode> {
    let url = rpc_url();
    let rpc_endpoint = format!("{}/getTransaction", url.trim_end_matches('/'));

    let body = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTransaction",
        "params": {
            "hash": tx_hash
        }
    });

    let resp = http_client()
        .post(&rpc_endpoint)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            error!("soroban_rpc: getTransaction HTTP failed: {e}");
            StatusCode::BAD_GATEWAY
        })?;

    if !resp.status().is_success() {
        let status = resp.status();
        error!("soroban_rpc: getTransaction returned {status}");
        return Err(StatusCode::BAD_GATEWAY);
    }

    let value: Value = resp.json().await.map_err(|e| {
        error!("soroban_rpc: getTransaction JSON parse failed: {e}");
        StatusCode::BAD_GATEWAY
    })?;

    Ok(value)
}
