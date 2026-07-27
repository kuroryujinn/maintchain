# MaintChain

> A multi-party compliance platform for industrial maintenance records, powered by Stellar Soroban smart contracts. Every repair becomes a permanent, verifiable on-chain record that survives audits because no single party can falsify it.

## Abstract

MaintChain prevents falsification of industrial maintenance records by enforcing a **multi-party approval workflow on-chain**. A maintenance record is only considered compliant after independent roles (technician, supervisor, optionally auditor) have recorded their approvals via Soroban smart contracts on Stellar Testnet. Evidence files remain off-chain; only cryptographic hashes are stored on-chain.

The project ships a full stack: **five Soroban contracts** (Rust, `no_std`, compiled to WASM), an **Axum REST backend** (Rust, PostgreSQL), a **Next.js 14 frontend** (App Router, Tailwind v4, Freighter wallet integration), and automated contract deployment scripts.

**Related documents:**
- [📘 Project Guide & Use Cases](./PROJECT_GUIDE.md) — Whitepaper: problem analysis, stakeholder analysis, industry scenarios, roadmap
- [🏗️ System Architecture & Design](./SYSTEM_DESIGN.md) — Full design: data flow, security model, component deep-dives, trade-off analysis
- [🔗 Stellar Integration & Contracts](./STELLAR_INTEGRATION.md) — Soroban contract deep-dives, SDK usage, deployment pipeline
- [📐 Architecture Diagram (Interactive)](./SYSTEM_DESIGN_DIAGRAM.html) — Visual HTML system architecture diagram (open in browser)

---

## Problem

Industrial maintenance records today suffer from four structural vulnerabilities:

| Vulnerability | Consequence |
|---------------|-------------|
| **Mutable** — paper logs and spreadsheets can be altered after the fact | No trusted historical record |
| **Single-party** — one person's approval is rarely audited by independent roles | Single point of failure |
| **Isolated** — a technician's reputation does not travel with them across employers | Repeated trust-building, credential friction |
| **Expensive to audit** — verifying a repair history requires chasing down siloed records | High compliance costs, fraud goes undetected |

The gap is not technical capability but **incentive compatibility**: no existing system chains approvals together in a way that makes falsification provably expensive and honest work provably cheap to verify. See [PROJECT_GUIDE.md](./PROJECT_GUIDE.md#2-the-problem-industrial-maintenance-record-tampering) for a full sector-by-sector breakdown of fraud costs and risk scenarios.

---

## Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js 14 + React 18 + Tailwind v4)              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Freighter wallet injection (window.freighter)        │  │
│  │  InvokeContract / SimulateContract helpers            │  │
│  │  REST API client (fetch → backend)                    │  │
│  └────────┬──────────────────────────────────┬───────────┘  │
│           │ Freighter                        │ fetch        │
│           ▼                                  ▼              │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │ Stellar Testnet      │    │ Backend (Axum + Postgres)  │ │
│  │ • Soroban contracts  │    │ • Equipment CRUD           │ │
│  │ • Horizon balance    │    │ • Maintenance orders       │ │
│  │ • Signed txs         │    │ • Supervisor approvals     │ │
│  └──────────────────────┘    │ • Audit trail             │ │
│                              │ • SHA-256 hashing         │ │
│                              └────────────────────────────┘ │
│                                                             │
│  Two independent paths: frontend calls Soroban RPC via      │
│  Freighter for on-chain ops, and REST API for off-chain     │
│  CRUD workflows.                                            │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

| Principle | Application |
|-----------|-------------|
| **Defense in depth** | Multi-party approval on-chain prevents any single party from falsifying a record |
| **Data minimization** | Only hashes and approval states on-chain; evidence files remain off-chain |
| **Separation of concerns** | Contracts hold immutable state; backend handles CRUD; frontend handles presentation |
| **Progressive trust** | Users start at zero trust and build reputation through verifiable work |

### Compliance Flow (6 stages)

```
Fault Detected → Worker Accepts → Evidence Uploaded
  → Evidence Verified → Approval Chain → Certificate Generated
```

**Stage 1 — Detection:** Equipment flagged by sensor or inspector.

**Stage 2 — Assignment:** Technician accepts order. Assignment recorded in backend; acceptance on-chain via `MaintenanceRecords` contract.

**Stage 3 — Evidence Upload:** Technician documents repair (photos, readings, parts). SHA-256 hash stored on-chain via `MaintenanceRecords.submit_evidence`. Files remain off-chain.

**Stage 4 — Verification:** Supervisor reviews evidence against work order. On-chain hash proves reviewer saw exactly what was submitted.

**Stage 5 — Multi-Party Approval:** Supervisor approves (or rejects) on-chain via `MultiPartyApproval.approve_by_supervisor`. Optional auditor signs via `approve_by_auditor`. `verify_compliance` returns `true` only when **all** required parties have approved.

**Stage 6 — Certificate Issuance:** `ComplianceAttestation` issues final certificate with issuer address, cert hash, and timestamp. Permanently on-chain, visible to any party.

### On-Chain / Off-Chain Boundary

| Concern | Location | Rationale |
|---------|----------|-----------|
| Evidence files (photos, videos, PDFs) | Off-chain (backend / IPFS) | On-chain storage prohibitively expensive for large files |
| Evidence hashes | On-chain (`MaintenanceRecords`) | Proof-of-existence without storing the file |
| Approval states | On-chain (`MultiPartyApproval`) | Immutable audit trail; no single party can rewrite history |
| Certificate attestations | On-chain (`ComplianceAttestation`) | Publicly verifiable; survives operator shutdown |
| Worker profiles, reviews, machine metadata | Off-chain (Postgres) | High churn; not safety-critical |
| Audit trail (approval log) | Off-chain (Postgres) | Supplementary to on-chain approvals |

---

## Smart Contracts

Five independent Soroban crates, each compiled to WASM (`wasm32v1-none`):

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| **EquipmentRegistry** | Equipment registration + versioned snapshots | `register_equipment`, `update_owner`, `get_equipment`, `get_equipment_version` |
| **MaintenanceRecords** | Maintenance order state machine (`Open → Submitted → PendingApproval → Compliant/Rejected`) | `create_record`, `submit_evidence`, `update_status`, `complete_record`, `get_record` |
| **MultiPartyApproval** | Approval bitmap (tech × supervisor × auditor). **Enforcement point** for compliance | `approve_by_technician`, `approve_by_supervisor`, `approve_by_auditor`, `reject_by_supervisor`, `verify_compliance`, `set_auditor_required` |
| **ComplianceAttestation** | Final certificate issuance with cross-contract compliance check | `issue_certificate`, `get_attestation` |
| **IdentityRegistry** | Identity verification per wallet (role, org, profile hash, version) | `verify_identity`, `is_verified`, `get_identity` |

Each contract includes unit tests. EquipmentRegistry, MultiPartyApproval, and IdentityRegistry have snapshot-based test snapshots in their `test_snapshots/tests/` directories.

---

## Repository Layout

```
.
├── README.md                     # This document
├── PROJECT_GUIDE.md              # Whitepaper — use cases, stakeholders, roadmap
├── SYSTEM_DESIGN.md              # Architecture — data flows, trade-offs, component design
├── STELLAR_INTEGRATION.md        # Contract deep-dives, deployment pipeline, SDK reference
├── render.yaml                   # Render Blueprint for backend deployment
├── Dockerfile                    # Multi-s
