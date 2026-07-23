// backend/src/tx_log.rs
// Blockchain transaction logging to PostgreSQL.
// Every on-chain operation should record its lifecycle here.

use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;
use tracing::info;

#[derive(Debug, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "tx_status", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TxStatus {
    Preparing,
    Simulating,
    WaitingForSignature,
    Submitting,
    Pending,
    Confirmed,
    Failed,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TxLogEntry {
    pub id: Uuid,
    pub wallet_address: String,
    pub contract_id: String,
    pub method: String,
    pub args: Option<Value>,
    pub status: TxStatus,
    pub transaction_xdr: Option<String>,
    pub transaction_hash: Option<String>,
    pub ledger: Option<i32>,
    pub simulation_result: Option<Value>,
    pub error_message: Option<String>,
    pub rpc_latency_ms: Option<i32>,
    pub gas_used: Option<i32>,
    pub retry_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Create a new transaction log entry.
pub async fn create_tx_log(
    db: &PgPool,
    wallet_address: &str,
    contract_id: &str,
    method: &str,
    args: Option<Value>,
) -> Result<Uuid, sqlx::Error> {
    let id = Uuid::new_v4();
    sqlx::query(
        r#"
        INSERT INTO transaction_log (id, wallet_address, contract_id, method, args, status)
        VALUES ($1, $2, $3, $4, $5, 'PREPARING')
        "#,
    )
    .bind(id)
    .bind(wallet_address)
    .bind(contract_id)
    .bind(method)
    .bind(args)
    .execute(db)
    .await?;

    info!("tx_log: created entry {} for {}.{}", id, contract_id, method);
    Ok(id)
}

/// Update the status of a transaction log entry.
pub async fn update_tx_status(
    db: &PgPool,
    id: Uuid,
    status: TxStatus,
    extra: Option<Value>,
) -> Result<(), sqlx::Error> {
    let now = chrono::Utc::now();

    let hash = extra.as_ref().and_then(|v| v.get("transaction_hash").and_then(|h| h.as_str().map(String::from)));
    let xdr = extra.as_ref().and_then(|v| v.get("transaction_xdr").and_then(|x| x.as_str().map(String::from)));
    let error = extra.as_ref().and_then(|v| v.get("error_message").and_then(|e| e.as_str().map(String::from)));
    let ledger = extra.as_ref().and_then(|v| v.get("ledger").and_then(|l| l.as_i64().map(|n| n as i32)));
    let rpc_latency = extra.as_ref().and_then(|v| v.get("rpc_latency_ms").and_then(|r| r.as_i64().map(|n| n as i32)));
    let gas = extra.as_ref().and_then(|v| v.get("gas_used").and_then(|g| g.as_i64().map(|n| n as i32)));
    let sim = extra.as_ref().and_then(|v| v.get("simulation_result").cloned());

    let is_terminal = status == TxStatus::Confirmed || status == TxStatus::Failed;

    sqlx::query(
        r#"
        UPDATE transaction_log
        SET status = $2,
            transaction_hash = COALESCE($3, transaction_hash),
            transaction_xdr = COALESCE($4, transaction_xdr),
            error_message = COALESCE($5, error_message),
            ledger = COALESCE($6, ledger),
            rpc_latency_ms = COALESCE($7, rpc_latency_ms),
            gas_used = COALESCE($8, gas_used),
            simulation_result = COALESCE($9, simulation_result),
            updated_at = $10,
            completed_at = CASE WHEN $11 THEN $10 ELSE completed_at END
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(&status)
    .bind(hash)
    .bind(xdr)
    .bind(error)
    .bind(ledger)
    .bind(rpc_latency)
    .bind(gas)
    .bind(sim)
    .bind(now)
    .bind(is_terminal)
    .execute(db)
    .await?;

    Ok(())
}

/// Increment retry count for a transaction.
pub async fn increment_retry(db: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE transaction_log
        SET retry_count = retry_count + 1,
            updated_at = now()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(db)
    .await?;

    Ok(())
}

/// Get recent transactions for a wallet.
pub async fn get_wallet_transactions(
    db: &PgPool,
    wallet_address: &str,
    limit: i64,
) -> Result<Vec<TxLogEntry>, sqlx::Error> {
    sqlx::query_as::<_, TxLogEntry>(
        r#"
        SELECT * FROM transaction_log
        WHERE wallet_address = $1
        ORDER BY created_at DESC
        LIMIT $2
        "#,
    )
    .bind(wallet_address)
    .bind(limit)
    .fetch_all(db)
    .await
}

// ── API Handlers ──

#[derive(Debug, Deserialize)]
pub struct TxLogFilter {
    pub wallet: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct TxLogResponse {
    pub data: Vec<TxLogEntry>,
    pub total: i64,
}

/// POST /api/tx-log — receive a transaction log event from the frontend
pub async fn post_tx_log(
    State(state): State<crate::AppState>,
    Json(event): Json<serde_json::Value>,
) -> StatusCode {
    let wallet_address = event["walletAddress"].as_str().unwrap_or("unknown");
    let contract_id = event["contractId"].as_str().unwrap_or("unknown");
    let method = event["method"].as_str().unwrap_or("unknown");
    let state_str = event["state"].as_str().unwrap_or("PREPARING");
    let tx_hash = event["transactionHash"].as_str();
    let error = event["error"].as_str();

    let status = match state_str {
        "PREPARING" => TxStatus::Preparing,
        "SIMULATING" => TxStatus::Simulating,
        "WAITING_FOR_SIGNATURE" => TxStatus::WaitingForSignature,
        "SUBMITTING" => TxStatus::Submitting,
        "PENDING" => TxStatus::Pending,
        "CONFIRMED" => TxStatus::Confirmed,
        "COMPLETE" => TxStatus::Confirmed,
        _ => {
            if state_str.contains("FAILED") || error.is_some() {
                TxStatus::Failed
            } else {
                TxStatus::Preparing
            }
        }
    };

    let id = Uuid::new_v4();

    let result = sqlx::query(
        r#"
        INSERT INTO transaction_log (id, wallet_address, contract_id, method, status, transaction_hash, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(id)
    .bind(wallet_address)
    .bind(contract_id)
    .bind(method)
    .bind(&status)
    .bind(tx_hash)
    .bind(error)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => StatusCode::CREATED,
        Err(e) => {
            tracing::error!("post_tx_log failed: {e}");
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

/// GET /api/tx-log — list transaction log entries
pub async fn list_tx_log(
    State(state): State<crate::AppState>,
    Query(filter): Query<TxLogFilter>,
) -> Result<Json<TxLogResponse>, (StatusCode, String)> {
    let limit = filter.limit.unwrap_or(50).min(200);
    let offset = filter.offset.unwrap_or(0);

    let (rows, total): (Vec<TxLogEntry>, i64) = match filter.wallet {
        Some(ref wallet) => {
            let rows = sqlx::query_as::<_, TxLogEntry>(
                r#"
                SELECT * FROM transaction_log
                WHERE wallet_address = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(wallet)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await
            .map_err(|e| {
                tracing::error!("list_tx_log query failed: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
            })?;

            let total: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM transaction_log WHERE wallet_address = $1",
            )
            .bind(wallet)
            .fetch_one(&state.db)
            .await
            .map_err(|e| {
                tracing::error!("list_tx_log count failed: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
            })?;

            (rows, total.0)
        }
        None => {
            let rows = sqlx::query_as::<_, TxLogEntry>(
                r#"
                SELECT * FROM transaction_log
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await
            .map_err(|e| {
                tracing::error!("list_tx_log query failed: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
            })?;

            let total: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM transaction_log",
            )
            .fetch_one(&state.db)
            .await
            .map_err(|e| {
                tracing::error!("list_tx_log count failed: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
            })?;

            (rows, total.0)
        }
    };

    Ok(Json(TxLogResponse { data: rows, total }))
}
