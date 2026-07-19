-- Migration 0003: Expand equipment schema per Tech-stack.md spec.
-- The spec requires: id, serial_number, name, location, owner_id
-- The initial schema only had: id, owner_id, metadata_hash

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS location TEXT;
