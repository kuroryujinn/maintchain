-- SQLx migrations: initial schema for MaintChain backend.
-- Run with: sqlx migrate run (requires sqlx-cli) or execute manually.

create table if not exists equipment (
  id uuid primary key,
  owner_id uuid not null,
  metadata_hash text
);

create table if not exists maintenance_records (
  id uuid primary key,
  equipment_id uuid not null references equipment(id),
  technician_id uuid not null,
  status text not null,
  evidence_hash text not null,
  created_at timestamptz not null default now()
);

-- approvals are append-only in the conceptual model.
-- For the MVP skeleton we store supervisor decisions + optional notes.
create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  maintenance_id uuid not null references maintenance_records(id),
  approver_id uuid not null,
  role text not null,
  decision text,
  approval_timestamp timestamptz not null default now(),
  note text
);

-- Enable gen_random_uuid() for approvals.id if not already present.
-- This is Postgres-specific (pgcrypto).
create extension if not exists pgcrypto;

