use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};

use std::cmp::min;
use std::net::SocketAddr;


mod audit;
mod complaint;
#[allow(dead_code)]
mod seed;
use audit::{approve_by_auditor, get_audit_trail};
use complaint::transition_to_compliant;

use tower_http::cors::{Any, CorsLayer};

use tracing::{error, info};

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
}

#[derive(Debug, Serialize)]
struct EquipmentListResponse {
    data: Vec<EquipmentRow>,
}

async fn list_equipment(
    State(state): State<AppState>,
) -> Result<Json<EquipmentListResponse>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, EquipmentRow>(
        r#"SELECT id, owner_id, metadata_hash FROM equipment ORDER BY id"#,
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
        insert into equipment (id, owner_id, metadata_hash)
        values ($1, $2, $3)
        on conflict (id) do update set
          owner_id = excluded.owner_id,
          metadata_hash = excluded.metadata_hash
        "#,
    )
    .bind(req.equipment_id)
    .bind(req.owner_id)
    .bind(req.metadata_hash)
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
    // First record supervisor approval + set status to PENDING_APPROVAL.
    let resp = supervisor_decision(State(state.clone()), Path(id), Json(req), "APPROVED").await?;

    // Then attempt to transition to COMPLIANT (MVP gating uses current approvals table).
    // Ignore conflict so demo flow still shows PENDING_APPROVAL if gating isn't met.
    let _ = transition_to_compliant(&state.db, resp.maintenance_id).await;

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

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    dotenvy::dotenv().ok();
    // Prefer POSTGRES_URL if provided; otherwise fall back to DATABASE_URL.
    // Supabase URLs often need `sslmode=require`.
    let database_url_raw = std::env::var("DATABASE_URL")
        .ok()
        .or_else(|| std::env::var("POSTGRES_URL").ok())
        // Allow Supabase-specific env name used in many templates
        .or_else(|| std::env::var("SUPABASE_Connection_STRING").ok())
        .unwrap_or_else(|| "postgres://maintchain:maintchain@localhost:5432/maintchain".to_string());


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
        .route(
            "/maintenance/:id/approvals/supervisor",
            post(supervisor_approve),
        )
        .route(
            "/maintenance/:id/approvals/supervisor/reject",
            post(supervisor_reject),
        )
        .route("/maintenance/:id/audit", get(get_audit_trail))
        .route(
            "/maintenance/:id/approvals/auditor",
            post(approve_by_auditor),
        )
        .layer(cors)
        .with_state(state);

    let addr: SocketAddr = "127.0.0.1:8081".parse()?;

    info!("backend listening on http://{addr}");
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;

    Ok(())
}
