//! IPFS evidence storage via Pinata API.
//! Stores files on Pinata, returns the IPFS CID (content identifier).
//! Only the CID hash is recorded on-chain — files remain off-chain.

use axum::http::StatusCode;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PinataResponse {
    #[serde(rename = "IpfsHash")]
    pub ipfs_hash: String,
    #[serde(rename = "PinSize")]
    pub pin_size: u64,
    #[serde(rename = "Timestamp")]
    pub timestamp: String,
}

/// Upload a file to Pinata IPFS and return the CID.
pub async fn upload_to_ipfs(
    api_key: &str,
    api_secret: &str,
    file_name: &str,
    file_bytes: Vec<u8>,
) -> Result<String, StatusCode> {
    let client = reqwest::Client::new();
    let form = reqwest::multipart::Form::new()
        .text("pinataOptions", r#"{"cidVersion":1}"#)
        .part(
            "file",
            reqwest::multipart::Part::bytes(file_bytes)
                .file_name(file_name.to_string()),
        );

    let res = client
        .post("https://api.pinata.cloud/pinning/pinFileToIPFS")
        .header("pinata_api_key", api_key)
        .header("pinata_secret_api_key", api_secret)
        .multipart(form)
        .send()
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY)?;

    if !res.status().is_success() {
        return Err(StatusCode::BAD_GATEWAY);
    }

    let body: PinataResponse = res
        .json()
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY)?;

    Ok(body.ipfs_hash)
}

/// Compute SHA-256 hash of file bytes for on-chain storage.
pub fn compute_file_hash(file_bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(file_bytes);
    let bytes = hasher.finalize();
    hex::encode(bytes)
}
