-- migrations/0005_transaction_log.sql

CREATE TYPE tx_status AS ENUM (
    'PREPARING', 'SIMULATING', 'WAITING_FOR_SIGNATURE',
    'SUBMITTING', 'PENDING', 'CONFIRMED', 'FAILED'
);

CREATE TABLE IF NOT EXISTS transaction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(56) NOT NULL,
    contract_id VARCHAR(56) NOT NULL,
    method TEXT NOT NULL,
    args JSONB,
    status tx_status NOT NULL DEFAULT 'PREPARING',
    transaction_xdr TEXT,
    transaction_hash VARCHAR(64),
    ledger INT,
    simulation_result JSONB,
    error_message TEXT,
    rpc_latency_ms INT,
    gas_used INT,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tx_log_wallet ON transaction_log(wallet_address);
CREATE INDEX idx_tx_log_status ON transaction_log(status);
CREATE INDEX idx_tx_log_hash ON transaction_log(transaction_hash);
CREATE INDEX idx_tx_log_created ON transaction_log(created_at DESC);
