-- Migration 0007: User verifications table for the Get Verified flow.
--
-- Mirrors on-chain IdentityRegistry verification records into Postgres
-- so the application layer can query verification state without hitting
-- the Soroban RPC endpoint. This is additive only — no ALTER to existing tables.
--
-- See: docs/superpowers/specs/2026-07-24-get-verified-design.md

CREATE TABLE IF NOT EXISTS user_verifications (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id),
    stellar_address        TEXT NOT NULL,
    role                   TEXT NOT NULL,
    organization           TEXT,
    profile_hash           TEXT NOT NULL,
    organization_hash      TEXT NOT NULL,
    verification_tx_hash   TEXT NOT NULL,
    verification_contract_id TEXT NOT NULL,
    verified_at            TIMESTAMPTZ NOT NULL,
    network                TEXT NOT NULL DEFAULT 'TESTNET',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Enforce one verification record per user per contract + network
    UNIQUE (user_id, verification_contract_id, network)
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_stellar
    ON user_verifications(stellar_address);

CREATE INDEX IF NOT EXISTS idx_user_verifications_user
    ON user_verifications(user_id);
