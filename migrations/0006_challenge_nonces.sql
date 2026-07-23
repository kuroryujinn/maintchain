-- migrations/0006_challenge_nonces.sql

CREATE TABLE IF NOT EXISTS challenge_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stellar_address VARCHAR(56) NOT NULL,
    nonce TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenge_nonces_address ON challenge_nonces(stellar_address);
CREATE INDEX idx_challenge_nonces_nonce ON challenge_nonces(nonce);
