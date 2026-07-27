// backend/src/auth.rs
// Wallet-signature verification for the option-(c) per-user auth flow,
// plus a middleware that enforces X-User-Address on protected endpoints.
//
// The proxy validates the session cookie and forwards the authenticated
// caller's Stellar address as the X-User-Address header. This module
// provides:
//
//   1. POST /auth/challenge  — generate nonce (public endpoint)
//   2. POST /auth/verify     — verify Ed25519 signature (public endpoint)
//   3. identity_middleware   — checks X-User-Address against string
//      identity fields in the JSON body (e.g. stellar_address).
//      Rejects mismatches with 403 FORBIDDEN.
//
// For UUID-based identity fields (owner_id, technician_id), the check
// requires a DB lookup and is done inline in the respective handlers.

use axum::{
    body::Body,
    extract::State,
    http::StatusCode,
    middleware,
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::AppState;

// ─── Request / Response types ────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ChallengeRequest {
    pub stellar_address: String,
}

#[derive(Debug, Serialize)]
pub struct ChallengeResponse {
    pub nonce: String,
    pub message: String,
    pub expires_at: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyRequest {
    pub stellar_address: String,
    pub nonce: String,
    pub signature: String, // Base64-encoded Ed25519 signature of the nonce message
}

#[derive(Debug, Serialize)]
pub struct VerifyResponse {
    pub verified: bool,
    pub stellar_address: String,
}

// ─── Handlers ───────────────────────────────────────────

/// POST /auth/challenge
///
/// Generates a random nonce, stores it in the database with a 5-minute TTL,
/// and returns it to the client along with the message to be signed.
pub async fn create_challenge(
    State(state): State<AppState>,
    Json(req): Json<ChallengeRequest>,
) -> Result<Json<ChallengeResponse>, (StatusCode, String)> {
    // Validate Stellar address format (G... public key, 56 chars)
    if !req.stellar_address.starts_with('G') || req.stellar_address.len() != 56 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid Stellar address: must be a 56-character G... address".to_string(),
        ));
    }

    // Generate cryptographically random 32-byte nonce
    use rand::Rng;
    let nonce_bytes: [u8; 32] = rand::thread_rng().gen();
    let nonce_hex = hex::encode(nonce_bytes);

    // Human-readable message the user signs with Freighter
    let message = format!(
        "MaintChain Auth\nAddress: {}\nNonce: {}\nTimestamp: {}",
        req.stellar_address,
        nonce_hex,
        chrono::Utc::now().to_rfc3339()
    );

    let expires_at = chrono::Utc::now() + chrono::Duration::minutes(5);

    sqlx::query(
        r#"
        INSERT INTO challenge_nonces (stellar_address, nonce, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(&req.stellar_address)
    .bind(&message)
    .bind(expires_at)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!("create_challenge db insert failed: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to create challenge".to_string(),
        )
    })?;

    info!("auth: challenge created for address={}", req.stellar_address);

    Ok(Json(ChallengeResponse {
        nonce: message.clone(),
        message,
        expires_at: expires_at.to_rfc3339(),
    }))
}

/// POST /auth/verify
///
/// Verifies that the Ed25519 signature was produced by the private key
/// corresponding to `stellar_address` signing the `nonce` message.
///
/// On success, marks the nonce as used (prevents replay) and returns
/// the verified Stellar address. The proxy uses this to issue a session
/// cookie — it does NOT issue a session token here.
pub async fn verify_challenge(
    State(state): State<AppState>,
    Json(req): Json<VerifyRequest>,
) -> Result<Json<VerifyResponse>, (StatusCode, String)> {
    // 1. Fetch the stored nonce, verify it exists, is not used, and is not expired
    let row = sqlx::query_as::<_, (String, chrono::DateTime<chrono::Utc>, bool)>(
        r#"
        SELECT nonce, expires_at, used
        FROM challenge_nonces
        WHERE stellar_address = $1 AND nonce = $2
        ORDER BY created_at DESC
        LIMIT 1
        "#,
    )
    .bind(&req.stellar_address)
    .bind(&req.nonce)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!("verify_challenge db fetch failed: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Verification failed".to_string(),
        )
    })?;

    let (stored_nonce, expires_at, used) = match row {
        Some(r) => r,
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                "Invalid nonce".to_string(),
            ))
        }
    };

    if used {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Nonce already used".to_string(),
        ));
    }

    if chrono::Utc::now() > expires_at {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Nonce expired".to_string(),
        ));
    }

    // 2. Verify the Ed25519 signature using stellar-strkey + ed25519-dalek
    use sha2::{Digest, Sha256};
    use stellar_strkey::Strkey;
    use ed25519_dalek::{Verifier, VerifyingKey};
    use base64::Engine as _;

    // Decode the Stellar address (G...) into a public key
    let strkey = Strkey::from_string(&req.stellar_address).map_err(|e| {
        error!("auth: invalid stellar address format: {e}");
        (StatusCode::BAD_REQUEST, "Invalid stellar address format".to_string())
    })?;

    let pub_key_bytes = match strkey {
        Strkey::PublicKeyEd25519(pk) => pk.0,
        _ => {
            return Err((
                StatusCode::BAD_REQUEST,
                "Address is not an Ed25519 public key".to_string(),
            ))
        }
    };

    // Decode the Base64 signature
    let sig_bytes = base64::engine::general_purpose::STANDARD
        .decode(&req.signature)
        .map_err(|e| {
            error!("auth: invalid signature base64: {e}");
            (StatusCode::BAD_REQUEST, "Invalid signature encoding".to_string())
        })?;

    // Build the verifying key
    let verifying_key = VerifyingKey::from_bytes(&pub_key_bytes).map_err(|e| {
        error!("auth: invalid public key bytes: {e}");
        (StatusCode::BAD_REQUEST, "Invalid public key".to_string())
    })?;

    // Build the signature
    let signature = ed25519_dalek::Signature::from_slice(&sig_bytes).map_err(|e| {
        error!("auth: invalid signature bytes: {e}");
        (StatusCode::BAD_REQUEST, "Invalid signature".to_string())
    })?;

    // SHA-256 hash the message first (matches Freighter's signMessage per SEP-30)
    let mut hasher = Sha256::new();
    hasher.update(stored_nonce.as_bytes());
    let message_hash = hasher.finalize();

    // Verify
    let verified = verifying_key.verify(&message_hash, &signature).is_ok();

    if !verified {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Signature does not match".to_string(),
        ));
    }

    // 3. Mark nonce as used (prevents replay)
    sqlx::query(
        "UPDATE challenge_nonces SET used = true WHERE stellar_address = $1 AND nonce = $2",
    )
    .bind(&req.stellar_address)
    .bind(&stored_nonce)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!("verify_challenge db update failed: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to finalize verification".to_string(),
        )
    })?;

    info!(
        "auth: challenge verified for address={}",
        req.stellar_address
    );

    Ok(Json(VerifyResponse {
        verified: true,
        stellar_address: req.stellar_address,
    }))
}

// ─── Identity Enforcement Middleware ────────────────────
//
// Runs on protected routes after the MAINTCHAIN_API_KEY check.
// If the proxy has set X-User-Address, this middleware:
//   1. Reads the JSON request body
//   2. Checks known string-typed identity fields (stellar_address)
//   3. If any field contains a value that doesn't match X-User-Address,
//      rejects with 403 FORBIDDEN
//   4. Otherwise reconstructs the request and passes it through
//
// UUID-based identity fields (owner_id, technician_id) are NOT checked
// here — they require a DB lookup and are handled inline.

/// Identity fields whose string values should match X-User-Address.
/// These are checked generically by the middleware.
const STELLAR_IDENTITY_FIELDS: &[&str] = &["stellar_address"];

/// Axum middleware that enforces X-User-Address against string identity fields.
pub async fn identity_middleware(
    req: axum::http::Request<Body>,
    next: middleware::Next,
) -> Result<axum::response::Response, (StatusCode, Json<serde_json::Value>)> {
    let user_address = req
        .headers()
        .get("X-User-Address")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_owned());

    let Some(ref user) = user_address else {
        // No X-User-Address header — proxy didn't authenticate this request.
        // In production this shouldn't happen for protected routes, but we
        // allow it in dev mode where the proxy might be bypassed.
        return Ok(next.run(req).await);
    };

    // Only inspect requests with a JSON body
    let content_type = req
        .headers()
        .get(axum::http::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !content_type.contains("application/json") {
        // Non-JSON bodies (multipart, etc.) skip the generic check
        return Ok(next.run(req).await);
    }

    // Read the full body
    let (parts, body) = req.into_parts();
    let bytes = axum::body::to_bytes(body, 1024 * 1024) // 1 MB limit
        .await
        .map_err(|e| {
            error!("identity_middleware: failed to read body: {e}");
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": {
                        "code": "BODY_READ_ERROR",
                        "message": "Failed to read request body".to_string()
                    }
                })),
            )
        })?;

    // Try to parse as JSON and check identity fields
    if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&bytes) {
        for field in STELLAR_IDENTITY_FIELDS {
            if let Some(value) = json.get(field).and_then(|v| v.as_str()) {
                if identity_field_matches(value, user) {
                    // This field matches — no violation
                    continue;
                }
                // The field value is a Stellar address that doesn't match
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(serde_json::json!({
                        "error": {
                            "code": "IDENTITY_MISMATCH",
                            "message": format!(
                                "Field '{}' value '{}' does not match the authenticated user '{}'",
                                field, value, user
                            )
                        }
                    })),
                ));
            }
        }
    }

    // Reconstruct the request with the original body bytes
    let req = axum::http::Request::from_parts(parts, Body::from(bytes));
    Ok(next.run(req).await)
}

/// Check if a field value matches the authenticated user's Stellar address.
/// Returns true if they match or if the value isn't a Stellar address format.
pub fn identity_field_matches(field_value: &str, authenticated_address: &str) -> bool {
    // If the field value isn't a Stellar address at all, skip the check
    if !field_value.starts_with('G') || field_value.len() != 56 {
        return true;
    }
    field_value == authenticated_address
}

/// Resolve a user UUID to a Stellar address via DB lookup.
/// Returns None if the user doesn't exist.
pub async fn resolve_user_stellar_address(
    db: &sqlx::PgPool,
    user_id: &uuid::Uuid,
) -> Result<Option<String>, sqlx::Error> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT stellar_address FROM users WHERE id = $1 AND stellar_address IS NOT NULL",
    )
    .bind(user_id)
    .fetch_optional(db)
    .await?;

    Ok(row.map(|r| r.0))
}
