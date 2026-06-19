-- Migration 0002: Blockchain Integration
-- Add contract addresses and transaction IDs to track on-chain state.

ALTER TABLE equipment ADD COLUMN contract_address TEXT;
ALTER TABLE maintenance_records ADD COLUMN tx_id TEXT;
ALTER TABLE approvals ADD COLUMN on_chain_tx_id TEXT;
