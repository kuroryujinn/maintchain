-- Migration 0006: Challenge nonces for wallet-signature authentication.
--
-- Used by the option-(c) auth flow:
--   1. Client requests nonce → stored here with 5-minute TTL
--   2. Client signs nonce with Freighter (Ed25519)
--   3. Backend verifies signature, marks nonce as used
--   4. Proxy issues HMAC-signed session cookie on successful verification

CREATE TABLE IF NOT EXISTS challenge_nonces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stellar_address TEXT NOT NULL,
    nonce           TEXT NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
    used            BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_nonces_address
    ON challenge_nonces(stellar_address);

CREATE INDEX IF NOT EXISTS idx_challenge_nonces_nonce
    ON challenge_nonces(nonce);
