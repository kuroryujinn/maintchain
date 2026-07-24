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
use uuid::Uuid;

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
