use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};use std::cmp::min;
use std::net::SocketAddr;
use sqlx::migrate::Migrator;

mod audit;
mod complaint;
mod soroban_client;
mod storage;
#[allow(dead_code)]
mod seed;
use audit::{approve_by_auditor, get_audit_trail};

use tower_http::cors::{Any, CorsLayer};

use tracing::{error, info};

// ─── Sentry / Error Tracking ─────────────────────────────────────
use sentry_tower::NewSentryLayer;

/// Initialize Sentry error tracking for the backend.
/// Reads SENTRY_DSN from the environment. If unset, Sentry is a no-op.
fn init_sentry() -> Option<sentry::ClientInitGuard> {
    let dsn = std::env::var("SENTRY_DSN").ok()?;
    if dsn.trim().is_empty() {
        return None;
    }
    let guard = sentry::init((
        dsn,
        sentry::ClientOptions {
            release: sentry::release_name!(),
            environment: Some(
                std::env::var("SENTRY_ENVIRONMENT")
                    .unwrap_or_else(|_| "production".to_string())
                    .into(),
            ),
            traces_sample_rate: 0.1,
            ..Default::default()
        },
    ));
    info!("Sentry error tracking initialized");
    Some(guard)
}

// Simple API key auth (demo-grade). Production should use Stellar auth / signed requests.
// Header: Authorization: Bearer <API_KEY>
// NOTE: Not wired into the router yet.
const API_KEY_ENV: &str = "MAINTCHAIN_API_KEY";

#[allow(dead_code)]
fn api_key() -> Option<String> {
    std::env::var(API_KEY_ENV)
        .ok()
        .filter(|s| !s.trim().is_empty())
}

#[allow(dead_code)]
fn is_authorized(authorization: Option<&str>) -> bool {
    let Some(expected) = api_key() else {
        return true;
    }; // if not set, allow in dev
    match authorization {
        Some(v) => v.trim() == format!("Bearer {}", expected),
        None => false,
    }
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
struct Authed;

#[allow(dead_code)]
async fn auth<B>(
    req: axum::http::Request<B>,
    _state: axum::extract::State<AppState>,
) -> Result<axum::http::Request<B>, axum::http::StatusCode> {
    let header = req
        .headers()
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());

    if is_authorized(header) {
        Ok(req)
    } else {
        Err(axum::http::StatusCode::UNAUTHORIZED)
    }
}

use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    db: PgPool,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[derive(Debug, Serialize)]
struct MaintenanceResponse {
    maintenance_id: Uuid,
    equipment_id: Uuid,
    technician_id: Uuid,
    status: String,
    evidence_hash: String,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct RegisterEquipmentRequest {
    equipment_id: Uuid,
    owner_id: Uuid,
    metadata_hash: Option<String>,
    serial_number: Option<String>,
    name: Option<String>,
    location: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateMaintenanceOrderRequest {
    equipment_id: Uuid,
    technician_id: Uuid,
}

#[derive(Debug, Deserialize)]
struct SubmitEvidenceRequest {
    evidence_hash: String,
}

#[derive(Debug, Deserialize)]
struct SupervisorDecisionRequest {
    decision_note: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EvidencePayloadForHashing {
    payload: String,
}

fn compute_evidence_hash(payload: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(payload.as_bytes());
    let bytes = hasher.finalize();
    hex::encode(bytes)
}

fn row_to_maintenance_response(row: sqlx::postgres::PgRow) -> MaintenanceResponse {
    let maintenance_id: Uuid = row.get("maintenance_id");
    let equipment_id: Uuid = row.get("equipment_id");
    let technician_id: Uuid = row.get("technician_id");
    let status: String = row.get("status");
    let evidence_hash: String = row.get("evidence_hash");
    let created_at: DateTime<Utc> = row.get("created_at");
    MaintenanceResponse {
        maintenance_id,
        equipment_id,
        technician_id,
        status,
        evidence_hash,
        created_at,
    }
}

async fn health() -> impl IntoResponse {
    Json(HealthResponse { status: "ok" })
}

#[derive(Debug, Serialize)]
struct HealthConfigResponse {
    status: &'static str,
    database_url_set: bool,
    database_url_prefix: Option<String>,
}

async fn health_config() -> impl IntoResponse {
    let db_url = std::env::var("DATABASE_URL").ok()
        .or_else(|| std::env::var("POSTGRES_URL").ok())
        .or_else(|| std::env::var("SUPABASE_Connection_STRING").ok());

    let prefix = db_url.as_ref().map(|s| {
        // mask password portion roughly by removing everything after '@' host separator
        let mut v = s.clone();
        if let Some(at) = v.find('@') {
            v.truncate(at + 1);
        }
        v.chars().take(48).collect::<String>()
    });

    Json(HealthConfigResponse {
        status: "ok",
        database_url_set: db_url.is_some(),
        database_url_prefix: prefix,
    })
}


#[derive(Debug, sqlx::FromRow, Serialize)]
struct EquipmentRow {
    id: Uuid,
    owner_id: Uuid,
    metadata_hash: Option<String>,
    serial_number: Option<String>,
    name: Option<String>,
    location: Option<String>,
}

#[derive(Debug, Serialize)]
struct EquipmentListResponse {
    data: Vec<EquipmentRow>,
}

async fn list_equipment(
    State(state): State<AppState>,
) -> Result<Json<EquipmentListResponse>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, EquipmentRow>(
        r#"SELECT id, owner_id, metadata_hash, serial_number, name, location FROM equipment ORDER BY id"#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!("list_equipment failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
    })?;

    Ok(Json(EquipmentListResponse { data: rows }))
}

async fn list_maintenance(
    State(state): State<AppState>,
) -> Result<Json<Vec<MaintenanceResponse>>, (StatusCode, String)> {
    let rows = sqlx::query(
        r#"
        select
            id as maintenance_id,
            equipment_id,
            technician_id,
            status::text as status,
            evidence_hash,
            created_at as created_at
        from maintenance_records
        order by created_at desc
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!("list_maintenance failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
    })?;

    Ok(Json(rows.into_iter().map(row_to_maintenance_response).collect()))
}

async fn register_equipment(
    State(state): State<AppState>,
    Json(req): Json<RegisterEquipmentRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, String)> {
    info!(
        "register_equipment equipment_id={} owner_id={}",
        req.equipment_id, req.owner_id
    );

    let res = sqlx::query(
        r#"
        insert into equipment (id, owner_id, metadata_hash, serial_number, name, location)
        values ($1, $2, $3, $4, $5, $6)
        on conflict (id) do update set
          owner_id = excluded.owner_id,
          metadata_hash = excluded.metadata_hash,
          serial_number = excluded.serial_number,
          name = excluded.name,
          location = excluded.location
        "#,
    )
    .bind(req.equipment_id)
    .bind(req.owner_id)
    .bind(req.metadata_hash)
    .bind(req.serial_number)
    .bind(req.name)
    .bind(req.location)
    .execute(&state.db)
    .await;

    match res {
        Ok(_) => Ok((StatusCode::CREATED, Json(serde_json::json!({"status": "created"})))),
        Err(e) => {
            error!("register_equipment failed: {e}");
            Err((StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string()))
        }
    }
}

async fn create_maintenance_order(
    State(state): State<AppState>,
    Json(req): Json<CreateMaintenanceOrderRequest>,
) -> Result<Json<MaintenanceResponse>, (StatusCode, String)> {
    let maintenance_id = Uuid::new_v4();
    info!(
        "create_maintenance_order maintenance_id={} equipment_id={} technician_id={}",
        maintenance_id, req.equipment_id, req.technician_id
    );

    let placeholder_evidence_hash = "PENDING".to_string();

    let inserted = sqlx::query(
        r#"
        insert into maintenance_records (id, equipment_id, technician_id, status, evidence_hash)
        values ($1, $2, $3, 'OPEN', $4)
        "#,
    )
    .bind(maintenance_id)
    .bind(req.equipment_id)
    .bind(req.technician_id)
    .bind(&placeholder_evidence_hash)
    .execute(&state.db)
    .await;

    if let Err(e) = inserted {
        error!("create_maintenance_order insert failed: {e}");
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string()));
    }

    let row = sqlx::query(
        r#"
        select
            id as maintenance_id,
            equipment_id,
            technician_id,
            status::text as status,
            evidence_hash,
            created_at as created_at
        from maintenance_records
        where id = $1
        "#,
    )
    .bind(maintenance_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!("create_maintenance_order fetch failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
    })?;

    let resp = row_to_maintenance_response(row);
    Ok(Json(resp))
}

async fn submit_evidence(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<SubmitEvidenceRequest>,
) -> Result<Json<MaintenanceResponse>, (StatusCode, String)> {
    let res = sqlx::query(
        r#"
        update maintenance_records
        set evidence_hash = $1,
            status = 'SUBMITTED'
        where id = $2
        "#,
    )
    .bind(req.evidence_hash)
    .bind(id)
    .execute(&state.db)
    .await;

    if let Err(e) = res {
        error!("submit_evidence update failed: {e}");
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string()));
    }

    let row = sqlx::query(
        r#"
        select
            id as maintenance_id,
            equipment_id,
            technician_id,
            status::text as status,
            evidence_hash,
            created_at as created_at
        from maintenance_records
        where id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!("submit_evidence fetch failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
    })?;

    Ok(Json(row_to_maintenance_response(row)))
}

async fn get_maintenance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<MaintenanceResponse>, (StatusCode, String)> {
    let row = sqlx::query(
        r#"
        select
            id as maintenance_id,
            equipment_id,
            technician_id,
            status::text as status,
            evidence_hash,
            created_at as created_at
        from maintenance_records
        where id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!("get_maintenance failed: {e}");
        (StatusCode::NOT_FOUND, "not found".to_string())
    })?;

    Ok(Json(row_to_maintenance_response(row)))
}

async fn supervisor_approve(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<SupervisorDecisionRequest>,
) -> Result<Json<MaintenanceResponse>, (StatusCode, String)> {
    // Record supervisor approval + set status to PENDING_APPROVAL.
    // The record stays PENDING_APPROVAL until an auditor certifies it.
    // Compliance transition happens in approve_by_auditor after both approvals exist.
    let resp = supervisor_decision(State(state.clone()), Path(id), Json(req), "APPROVED").await?;

    Ok(resp)
}

async fn supervisor_reject(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<SupervisorDecisionRequest>,
) -> Result<Json<MaintenanceResponse>, (StatusCode, String)> {
    supervisor_decision(State(state), Path(id), Json(req), "REJECTED").await
}

async fn supervisor_decision(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<SupervisorDecisionRequest>,
    decision: &str,
) -> Result<Json<MaintenanceResponse>, (StatusCode, String)> {
    let status_target = if decision == "APPROVED" {
        "PENDING_APPROVAL"
    } else {
        "SUBMITTED"
    };

    let note = req.decision_note;

    sqlx::query(
        r#"
        update maintenance_records
        set status = $1
        where id = $2
        "#,
    )
    .bind(status_target)
    .bind(id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!("supervisor_decision update failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
    })?;

    // Store approval event.
    sqlx::query(
        r#"
        insert into approvals (maintenance_id, approver_id, role, decision, approval_timestamp, note)
        values ($1, $2, 'SUPERVISOR', $3, now(), $4)
        "#,
    )
    .bind(id)
    .bind(Uuid::nil())
    .bind(decision)
    .bind(note)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!("supervisor_decision insert approval failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
    })?;

    let row = sqlx::query(
        r#"
        select
            id as maintenance_id,
            equipment_id,
            technician_id,
            status::text as status,
            evidence_hash,
            created_at as created_at
        from maintenance_records
        where id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!("supervisor_decision fetch failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
    })?;

    Ok(Json(MaintenanceResponse {
        maintenance_id: row.get("maintenance_id"),
        equipment_id: row.get("equipment_id"),
        technician_id: row.get("technician_id"),
        status: row.get("status"),
        evidence_hash: row.get("evidence_hash"),
        created_at: row.get("created_at"),
    }))
}

async fn compute_hash(Json(req): Json<EvidencePayloadForHashing>) -> impl IntoResponse {
    let hash = compute_evidence_hash(&req.payload);
    Json(serde_json::json!({ "evidence_hash": hash }))
}

async fn upload_evidence_file(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut file_name = String::new();
    let mut file_bytes = Vec::new();

    while let Some(field) = multipart.next_field().await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))? {
        if let Some(name) = field.name().map(String::from) {
            file_name = name;
        }
        file_bytes = field.bytes().await
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
            .to_vec();
    }

    if file_bytes.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "No file uploaded".to_string()));
    }

    // Compute SHA-256 hash of the file for on-chain storage
    let evidence_hash = storage::compute_file_hash(&file_bytes);

    // Attempt IPFS upload if Pinata credentials are configured
    let ipfs_cid = match (
        std::env::var("PINATA_API_KEY"),
        std::env::var("PINATA_API_SECRET"),
    ) {
        (Ok(key), Ok(secret)) => {
            match storage::upload_to_ipfs(&key, &secret, &file_name, file_bytes).await {
                Ok(cid) => Some(cid),
                Err(_) => None,
            }
        }
        _ => None,
    };

    // Update the maintenance record with the evidence hash
    sqlx::query(
        r#"
        UPDATE maintenance_records
        SET evidence_hash = $1,
            status = 'SUBMITTED'
        WHERE id = $2
        "#,
    )
    .bind(&evidence_hash)
    .bind(id)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({
        "evidence_hash": evidence_hash,
        "ipfs_cid": ipfs_cid,
        "file_name": file_name,
        "status": "submitted"
    })))
}

#[derive(Debug, Deserialize)]
struct RegisterUserRequest {
    stellar_address: String,
    name: String,
    role: String,
    organization: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct UserResponse {
    id: Uuid,
    stellar_address: Option<String>,
    name: String,
    role: String,
    organization: Option<String>,
    created_at: DateTime<Utc>,
}

async fn register_user(
    State(state): State<AppState>,
    Json(req): Json<RegisterUserRequest>,
) -> Result<(StatusCode, Json<UserResponse>), (StatusCode, String)> {
    let id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO users (id, stellar_address, name, role, organization) VALUES ($1, $2, $3, $4, $5)"#,
    )
    .bind(id)
    .bind(&req.stellar_address)
    .bind(&req.name)
    .bind(&req.role)
    .bind(&req.organization)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!("register_user failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let row = sqlx::query_as::<_, UserResponse>(
        r#"SELECT id, stellar_address, name, role, organization, created_at FROM users WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(row)))
}

async fn get_user_by_stellar(
    State(state): State<AppState>,
    Path(stellar_address): Path<String>,
) -> Result<Json<UserResponse>, (StatusCode, String)> {
    let row = sqlx::query_as::<_, UserResponse>(
        r#"SELECT id, stellar_address, name, role, organization, created_at FROM users WHERE stellar_address = $1"#,
    )
    .bind(&stellar_address)
    .fetch_one(&state.db)
    .await
    .map_err(|_| (StatusCode::NOT_FOUND, "user not found".to_string()))?;
    Ok(Json(row))
}

async fn list_users(
    State(state): State<AppState>,
) -> Result<Json<Vec<UserResponse>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, UserResponse>(
        r#"SELECT id, stellar_address, name, role, organization, created_at FROM users ORDER BY created_at DESC"#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!("list_users failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "db error".to_string())
    })?;
    Ok(Json(rows))
}

#[derive(Debug, Serialize)]
struct UserCountResponse {
    total_users: i64,
}

async fn user_count(
    State(state): State<AppState>,
) -> Result<Json<UserCountResponse>, (StatusCode, String)> {
    let count: (i64,) = sqlx::query_as::<_, (i64,)>(r#"SELECT COUNT(*) FROM users"#)
        .fetch_one(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(UserCountResponse { total_users: count.0 }))
}

async fn list_pending_approvals(
    State(state): State<AppState>,
) -> Result<Json<Vec<MaintenanceResponse>>, (StatusCode, String)> {
    let rows = sqlx::query(
        r#"
        SELECT id AS maintenance_id, equipment_id, technician_id,
               status::text AS status, evidence_hash, created_at
        FROM maintenance_records
        WHERE status IN ('SUBMITTED', 'PENDING_APPROVAL')
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(rows.into_iter().map(row_to_maintenance_response).collect()))
}

#[derive(Debug, Serialize)]
struct ComplianceDashboardResponse {
    total_equipment: i64,
    compliant_records: i64,
    pending_records: i64,
    rejected_records: i64,
    compliance_score: f64,
    overdue_count: i64,
}

async fn compliance_dashboard(
    State(state): State<AppState>,
) -> Result<Json<ComplianceDashboardResponse>, (StatusCode, String)> {
    let total: (i64,) = sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM equipment")
        .fetch_one(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let compliant: (i64,) = sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM maintenance_records WHERE status = 'COMPLIANT'")
        .fetch_one(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let pending: (i64,) = sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM maintenance_records WHERE status IN ('SUBMITTED', 'PENDING_APPROVAL')")
        .fetch_one(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rejected: (i64,) = sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM maintenance_records WHERE status = 'REJECTED'")
        .fetch_one(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total_records = compliant.0 + pending.0 + rejected.0;
    let score = if total_records > 0 { (compliant.0 as f64 / total_records as f64) * 100.0 } else { 0.0 };

    Ok(Json(ComplianceDashboardResponse {
        total_equipment: total.0,
        compliant_records: compliant.0,
        pending_records: pending.0,
        rejected_records: rejected.0,
        compliance_score: score,
        overdue_count: 0,
    }))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    dotenvy::dotenv().ok();

    // ── SENTRY INIT ──
    // Initialize Sentry error tracking (no-op if SENTRY_DSN is unset)
    // The guard must be kept alive for the duration of the program.
    let _sentry_guard = init_sentry();

    // ── DATABASE CONNECTION ──
    // Priority order:
    // 1. DATABASE_URL env var (set in Render dashboard or .env file)
    // 2. POSTGRES_URL env var (alternative name)
    // 3. Hardcoded Supabase pooled URL (IPv4-compatible fallback)
    //
    // The hardcoded fallback exists because Render dashboard env vars
    // sometimes revert to stale values. We filter env vars to only accept
    // URLs that point to Supabase (to catch stale Render values).
    const SUPABASE_URL: &str = "postgresql://postgres.djewwnatnidmgkhiqgne:Maintchain2006@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres";

    let database_url_raw = std::env::var("DATABASE_URL")
        .ok()
        .filter(|url| {
            url.contains("supabase.co") || url.contains("pooler.supabase.com")
        })
        .or_else(|| std::env::var("POSTGRES_URL").ok())
        .or_else(|| std::env::var("SUPABASE_Connection_STRING").ok())
        .unwrap_or_else(|| SUPABASE_URL.to_string());


    let database_url_raw_prefix = database_url_raw
        .get(0..min(32, database_url_raw.len()))
        .unwrap_or("")
        .to_string();
    info!("Using database_url_raw prefix: {}", database_url_raw_prefix);

    let database_url = if database_url_raw.starts_with("https://") {
        database_url_raw.clone()
    } else if database_url_raw.contains("sslmode=") {
        database_url_raw.clone()
    } else {
        format!("{database_url_raw}?sslmode=require")
    };








    // Supabase often requires IPv4 for outbound connectivity from some environments.
    // If the hostname resolves to IPv6 but IPv6 egress is blocked, connection attempts can fail.
    // We add a small fallback attempt: if the URL contains the known Supabase host and it fails,
    // force IPv4 by replacing it with an explicit IPv4 address is not possible reliably here.
    // So instead we surface the URL and let the user fix networking.
    let db = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    // Run database migrations (creates tables if they don't exist)
    // Runtime path resolves relative to working directory:
    // - Docker: WORKDIR=/app, migrations at /app/migrations/ → "migrations"
    // - Local: run from backend/ → "migrations" resolves to backend/migrations/
    let migrator = Migrator::new(std::path::Path::new("migrations")).await?;
    migrator.run(&db).await?;
    info!("Database migrations applied successfully");

    let state = AppState { db };

    // CORS — allow all origins for local development
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Health
        .route("/health", get(health))
        .route("/health/config", get(health_config))

        // Hash utility
        .route("/hash/evidence", post(compute_hash))

        // Equipment (RESTful: plural noun, POST to create, GET to list)
        .route("/equipment", get(list_equipment).post(register_equipment))

        // Maintenance records
        .route("/maintenance", get(list_maintenance))
        .route("/maintenance/orders", post(create_maintenance_order))
        .route("/maintenance/:id", get(get_maintenance))
        .route("/maintenance/:id/evidence", post(submit_evidence))
        .route("/maintenance/:id/evidence/upload", post(upload_evidence_file))
        .route(
            "/maintenance/:id/approvals/supervisor",
            post(supervisor_approve),
        )
        .route(
            "/maintenance/:id/approvals/supervisor/reject",
            post(supervisor_reject),
        )
        .route("/maintenance/:id/audit", get(get_audit_trail))        .route("/maintenance/:id/approvals/auditor",
            post(approve_by_auditor),
        )
        .route("/maintenance/pending", get(list_pending_approvals))
        .route("/compliance/dashboard", get(compliance_dashboard))
        .route("/users", get(list_users).post(register_user))
        .route("/users/count", get(user_count))
        .route("/users/:stellar_address", get(get_user_by_stellar))

        // Sentry middleware — captures performance data and errors for all requests
        .layer(NewSentryLayer::new_from_top())
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8081".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse()
        .expect("Invalid PORT value; must be a valid port number");

    info!("backend listening on http://{addr}");
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;

    Ok(())
}
