-- Migration 0004: User roles table per Tech-stack.md spec.
-- Defines the 4 user roles: TECHNICIAN, SUPERVISOR, AUDITOR, OWNER
-- Each user has a Stellar wallet address and role-based permissions.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stellar_address TEXT UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('TECHNICIAN', 'SUPERVISOR', 'AUDITOR', 'OWNER')),
    organization TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key from approvals to users (optional, for referential integrity)
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
