// backend/src/auth.rs
// Wallet ownership verification through challenge-response signing.
//
// Flow:
//   1. Client requests a nonce: POST /api/auth/challenge { stellar_address }
//   2. Server stores nonce with 5-minute expiry
//   3. Client signs nonce with Freighter and sends: POST /api/auth/verify { stellar_address, signature, nonce }
//   4. Server verifies the signature came from the private key of stellar_address
//   5. Server marks nonce as used, returns session token

use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::{info, error};

#[derive(Debug, Deserialize)]
pub struct ChallengeRequest {
    pub stellar_address: String,
}

#[derive(Debug, Serialize)]
pub struct ChallengeResponse {
    pub nonce: String,
    pub expires_at: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyRequest {
    pub stellar_address: String,
    pub nonce: String,
    pub signature: String,    // Base64-encoded ed25519 signature of the nonce
}

#[derive(Debug, Serialize)]
pub struct VerifyResponse {
    pub verified: bool,
    pub token: String,
    pub expires_at: String,
}

/// POST /api/auth/challenge
///
/// Creates a nonce for the given Stellar address.
/// The nonce is a random string that must be signed by the wallet's private key.
pub async fn create_challenge(
    State(state): State<crate::AppState>,
    Json(req): Json<ChallengeRequest>,
) -> Result<Json<ChallengeResponse>, (StatusCode, String)> {
    // Validate stellar address format (G... public key)
    if !req.stellar_address.starts_with('G') || req.stellar_address.len() != 56 {
        return Err((StatusCode::BAD_REQUEST, "Invalid Stellar address".to_string()));
    }

    // Generate random nonce
    use rand::Rng;
    let nonce: [u8; 32] = rand::thread_rng().gen();
    let nonce_hex = hex::encode(nonce);

    // Message the user will sign
    let message = format!(
        "MaintChain Auth\nAddress: {}\nNonce: {}\nTimestamp: {}",
        req.stellar_address,
        nonce_hex,
        chrono::Utc::now().to_rfc3339()
    );

    // Store in database
    sqlx::query(
        r#"
        INSERT INTO challenge_nonces (stellar_address, nonce, expires_at)
        VALUES ($1, $2, now() + interval '5 minutes')
        "#,
    )
    .bind(&req.stellar_address)
    .bind(&message)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!("create_challenge db insert failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create challenge".to_string())
    })?;

    let expires_at = (chrono::Utc::now() + chrono::Duration::minutes(5)).to_rfc3339();

    info!("auth: challenge created for address={}", req.stellar_address);

    Ok(Json(ChallengeResponse {
        nonce: message.clone(),
        expires_at,
        message,
    }))
}

/// POST /api/auth/verify
///
/// Verifies that the signature was produced by the private key
/// corresponding to stellar_address signing the nonce message.
pub async fn verify_challenge(
    State(state): State<crate::AppState>,
    Json(req): Json<VerifyRequest>,
) -> Result<Json<VerifyResponse>, (StatusCode, String)> {
    // Fetch and validate nonce
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
        (StatusCode::INTERNAL_SERVER_ERROR, "Verification failed".to_string())
    })?;

    let (stored_nonce, expires_at, used) = match row {
        Some(r) => r,
        None => return Err((StatusCode::UNAUTHORIZED, "Invalid nonce".to_string())),
    };

    if used {
        return Err((StatusCode::UNAUTHORIZED, "Nonce already used".to_string()));
    }

    if chrono::Utc::now() > expires_at {
        return Err((StatusCode::UNAUTHORIZED, "Nonce expired".to_string()));
    }

    // Verify the ed25519 signature using stellar-strkey
    let verified = crate::soroban_client::verify_ed25519_signature(
        &req.stellar_address,
        stored_nonce.as_bytes(),
        &req.signature,
    ).map_err(|e| {
        error!("verify_challenge signature verification failed: {e}");
        (StatusCode::UNAUTHORIZED, "Signature verification failed".to_string())
    })?;

    if !verified {
        return Err((StatusCode::UNAUTHORIZED, "Signature does not match".to_string()));
    }

    // Mark nonce as used
    sqlx::query(
        "UPDATE challenge_nonces SET used = true WHERE stellar_address = $1 AND nonce = $2",
    )
    .bind(&req.stellar_address)
    .bind(&stored_nonce)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!("verify_challenge db update failed: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to finalize verification".to_string())
    })?;

    // Generate session token
    let token = crate::soroban_client::generate_session_token(
        &req.stellar_address,
        &stored_nonce,
    );

    let session_expires = (chrono::Utc::now() + chrono::Duration::hours(24)).to_rfc3339();

    info!("auth: challenge verified for address={}", req.stellar_address);

    Ok(Json(VerifyResponse {
        verified: true,
        token,
        expires_at: session_expires,
    }))
}
