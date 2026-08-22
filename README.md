# MaintChain

> A multi-party compliance platform for industrial maintenance records, powered by Stellar Soroban smart contracts. Every repair becomes a permanent, verifiable on-chain record that survives audits because no single party can falsify it.

## Abstract

MaintChain prevents falsification of industrial maintenance records by enforcing a **multi-party approval workflow on-chain**. A maintenance record is only considered compliant after independent roles (technician, supervisor, optionally auditor) have recorded their approvals via Soroban smart contracts on Stellar Testnet. Evidence files remain off-chain; only cryptographic hashes are stored on-chain.

The project ships a full stack: **five Soroban contracts** (Rust, `no_std`, compiled to WASM), an **Axum REST backend** (Rust, PostgreSQL), a **Next.js 14 frontend** (App Router, Tailwind v4, Freighter wallet integration), and automated contract deployment scripts.

**Related documents:**
- [📘 Project Guide & Use Cases](./PROJECT_GUIDE.md) — Whitepaper: problem analysis, stakeholder analysis, industry scenarios, roadmap
- [🏗️ System Architecture & Design](./SYSTEM_DESIGN.md) — Full design: data flow, security model, component deep-dives, trade-off analysis
- [🔗 Stellar Integration & Contracts](./STELLAR_INTEGRATION.md) — Soroban contract deep-dives, SDK usage, deployment pipeline

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
│  │  REST API client (fetch -> backend)                    │  │
│  └────────┬──────────────────────────────────┬───────────┘  │
│           │ Freighter                        │ fetch        │
│           ▼                                  ▼              │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │ Stellar Testnet      │    │ Backend (Axum + Postgres)  │ │
│  │ . Soroban contracts  │    │ . Equipment CRUD           │ │
│  │ . Horizon balance    │    │ . Maintenance orders       │ │
│  │ . Signed txs         │    │ . Supervisor approvals     │ │
│  └──────────────────────┘    │ . Audit trail             │ │
│                              │ . SHA-256 hashing         │ │
│                              └────────────────────────────┘ │
│                                                             │
│                                                             │
│  Two independent paths + proxy auth layer:                   │
│  · On-chain ops via Freighter → Soroban RPC                  │
│  · Off-chain CRUD via fetch → Next.js API proxy → backend   │
│  · Proxy enforces two-layer auth (API key + wallet session)  │
└─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │  Next.js API Proxy                  │
  │  [...proxy]/route.ts                 │
  │                                     │
  │  Layer 1: MAINTCHAIN_API_KEY        │
  │    → injects Bearer token           │
  │                                     │
  │  Layer 2: HMAC-signed session       │
  │    → validates cookie               │
  │    → adds X-User-Address header     │
  │                                     │
  │  /api/auth/challenge → public       │
  │  /api/auth/verify    → public       │
  │  /api/auth/logout    → public       │
  │  /api/auth/me        → public       │
  │  everything else     → requires     │
  │                         session     │
  └─────────────────────────────────────┘
```

### Authentication Model

MaintChain uses a **two-layer authentication architecture**:

| Layer | Type | Mechanism | Purpose |
|-------|------|-----------|---------|
| 1 | Server-to-server | `MAINTCHAIN_API_KEY` Bearer token injected by proxy | Only the proxy can call the backend |
| 2 | Per-user session | SEP-53 challenge-response → HMAC-signed cookie | Proves the browser user owns their wallet |

**Layer 2 — Challenge-Response Flow (SEP-53):**

Freighter v6's `signMessage` follows **SEP-53** (Sign and Verify Messages). The backend verifies the signature using the same algorithm:

```
Browser                          Proxy                         Backend
  │                                │                              │
  │── POST /api/auth/challenge ───►─────── /auth/challenge ─────►│
  │                                │    Generate 32-byte nonce    │
  │                                │    Store message in DB       │
  │◄── { message, expires_at } ───◄─────── { message } ──────────◄│
  │                                │                              │
  │── Freighter signMessage() ────►                                │
  │   SEP-53:                                                    │
  │   1. SHA256("Stellar Signed Message:\n" + message)            │
  │   2. Ed25519_sign(hash)                                      │
  │◄── { signedMessage } ─────────                                │
  │                                │                              │
  │── POST /api/auth/verify ──────►─────── /auth/verify ─────────►│
  │   { nonce, signature }        │   1. Look up stored nonce    │
  │                               │   2. SHA256("Stellar Signed  │
  │                               │      Message:\n" + nonce)    │
  │                               │   3. Ed25519_verify(sig,hash)│
  │◄── 200 + Set-Cookie ─────────◄─────── { verified:true } ────◄│
```

On successful verification, the proxy issues an **HttpOnly HMAC-SHA256 signed session cookie**. Every subsequent API request validates this cookie and injects the authenticated user's Stellar address as the `X-User-Address` header. The backend's `identity_middleware` enforces this by rejecting requests where a `stellar_address` field in the JSON body doesn't match the authenticated session.

See [STELLAR_INTEGRATION.md](./STELLAR_INTEGRATION.md#6-wallet-verification--session-auth) for the full cryptographic detail.

### Design Principles

| Principle | Application |
|-----------|-------------|
| **Defense in depth** | Multi-party approval on-chain prevents any single party from falsifying a record |
| **Data minimization** | Only hashes and approval states on-chain; evidence files remain off-chain |
| **Separation of concerns** | Contracts hold immutable state; backend handles CRUD; frontend handles presentation |
| **Progressive trust** | Users start at zero trust and build reputation through verifiable work |

### Compliance Flow (6 stages)

```
Fault Detected -> Worker Accepts -> Evidence Uploaded
  -> Evidence Verified -> Approval Chain -> Certificate Generated
```

**Stage 1 — Detection:** Equipment flagged by sensor or inspector.

**Stage 2 — Assignment:** Technician accepts order. Assignment recorded in backend; acceptance on-chain via `MaintenanceRecords` contract.

**Stage 3 — Evidence Upload:** Technician documents repair (photos, readings, parts). SHA-256 hash stored on-chain via `MaintenanceRecords.submit_evidence`. Files remain off-chain.

**Stage 4 — Verification:** Supervisor reviews evidence against work order. On-chain hash proves reviewer saw exactly what was submitted.

**Stage 5 — Multi-Party Approval:** Supervisor approves (or rejects) on-chain via `MultiPartyApproval.approve_by_supervisor`. Optional auditor signs via `approve_by_auditor`. `verify` returns `true` only when **all** required parties have approved.

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
| **MaintenanceRecords** | Maintenance order state machine (Open -> Submitted -> PendingApproval -> Compliant/Rejected) | `create_record`, `submit_evidence`, `update_status`, `complete`, `set_authorized_completer`, `get_record` |
| **MultiPartyApproval** | Approval bitmap (tech x supervisor x auditor). **Enforcement point** for compliance | `approve_by_technician`, `approve_by_supervisor`, `approve_by_auditor`, `reject_by_supervisor`, `verify`, `set_auditor_required` |
| **ComplianceAttestation** | Final certificate issuance with cross-contract compliance check | `issue_certificate`, `get_attestation` |
| **IdentityRegistry** | Identity verification per wallet (role, org, profile hash, version). **Entry point for Get Verified flow** | `verify_identity`, `is_verified`, `get_verification` |

The **Get Verified** flow (`/get-verified`) walks users through a 7-stage identity verification: connect wallet → approve challenge → backend readiness check → create profile → compute SHA-256 identity hashes → sign `IdentityRegistry.verify_identity` transaction in Freighter → confirmation. Once verified, the user's role, organization, and profile hash are recorded on-chain, providing a portable identity that travels with their Stellar wallet across the platform.

Each contract includes unit tests. EquipmentRegistry, MultiPartyApproval, ComplianceAttestation, and IdentityRegistry have snapshot-based test snapshots in their `test_snapshots/tests/` directories.

---

## Repository Layout

```
.
+-- README.md                     # This document
+-- PROJECT_GUIDE.md              # Whitepaper -- use cases, stakeholders, roadmap
+-- SYSTEM_DESIGN.md              # Architecture -- data flows, trade-offs, component design
+-- STELLAR_INTEGRATION.md        # Contract deep-dives, deployment pipeline, SDK reference
+-- render.yaml                   # Render Blueprint for backend deployment
+-- Dockerfile                    # Multi-stage Docker build for backend (Rust + Postgres)
|
+-- backend/                      # Rust (Axum) REST API
|   +-- Cargo.toml                # Dependencies: axum, sqlx (Postgres), soroban-sdk, sha2
|   +-- migrations/               # SQL migrations (0001-0008)
|   +-- src/
|       +-- main.rs               # Router, handlers, CORS, DB pool
|       +-- auth.rs               # SEP-53 challenge-response + HMAC session cookies
|       +-- audit.rs              # Audit trail, auditor approval
|       +-- complaint.rs          # Compliance transition logic
|       +-- soroban_client.rs     # Native Rust Soroban RPC client (verify-only)
|       +-- soroban_rpc.rs        # Native Soroban RPC transport (simulate, ScVal decode)
|       +-- storage.rs            # File hashing + IPFS upload
|       +-- tx_log.rs             # Transaction log endpoint (mirrors frontend tx status)
|       +-- seed.rs               # Database seeder
|       +-- seed_main.rs          # Binary entry point for seeding
|
+-- contracts/                    # Soroban smart contracts (workspace, 5 members)
|   +-- Cargo.toml
|   +-- equipment-registry/
|   +-- maintenance-records/
|   +-- multi-party-approval/
|   +-- compliance-attestation/
|   +-- identity-registry/
|
+-- frontend/                     # Next.js 14 (App Router)
|   +-- package.json              # next 14.2, react 18, stellar-sdk 13, freighter-api 6
|   +-- vercel.json               # Framework config (Next.js, build command)
|   +-- src/
|       +-- app/                  # Route pages (24 routes: 21 static + 3 dynamic)
|       |   +-- page.tsx          # Landing page (Hero, TrustReplay, Stats)
|       |   +-- dashboard/        # Worker dashboard with SVG metrics
|       |   +-- upload/           # Evidence upload, drag-drop zone
|       |   +-- approve/          # Supervisor approval center
|       |   +-- audit/            # Visual audit timeline
|       |   +-- workers/          # Worker discovery + profiles
|       |   +-- machines/         # Machine passport directory
|       |   +-- get-verified/     # Identity verification (7-stage flow)
|       |   +-- certificates/     # Certificate registry
|       |   +-- live-network/     # Real-time activity feed
|       |   +-- leaderboard/      # Global trust rankings
|       +-- components/
|       |   +-- maintchain/       # UI component library (15+ components)
|       |   +-- WalletConnectPanel.tsx
|       +-- data/
|       |   +-- maintchain.ts     # Seed data (workers, machines, certificates)
|       +-- hooks/
|       |   +-- useSoroban.ts     # Freighter auth, balance, contract calls
|       |   +-- useTransactionState.ts # On-chain tx lifecycle (idle/pending/success/timeout/failed)
|       +-- lib/
|           +-- api.ts            # Typed REST client
|           +-- api-types.ts      # Request/response schemas
|           +-- roles.ts          # Single source of truth for roles (drift-guarded by roles.test.ts + scripts/check-role-drift.mjs)
|           +-- registration-error.ts # 409 duplicate-registration mapping
|           +-- soroban.ts        # Contract invocation (simulate, sign, submit, poll)
|           +-- tx-status-handler.ts # Shared on-chain failure handling
|           +-- transaction-logger.ts # Mirrors tx status to backend /tx-log
|
+-- scripts/
|   +-- deploy-contracts.mjs      # WASM upload + contract deploy to Soroban RPC
|   +-- soroban-invoke.mjs        # Node.js helper for simulate-only contract calls
|   +-- check-role-drift.mjs      # CI guard: roles.ts vs users_role_check constraint
|   +-- check-contract-members.mjs # CI guard: workspace members ↔ crate dirs ↔ package names
|   +-- check-deploy-contracts.mjs # CI guard: deploy script wasm refs ↔ workspace crates
|   +-- test-setup.mjs            # Integration test scaffolding
|
+-- infra/
    +-- docker-compose.yml        # Postgres 16 for local development
```

---

## Setup

### Prerequisites

| Dependency | Version | Installation |
|-----------|---------|-------------|
| Rust toolchain | nightly-2024-03+ | `rustup install nightly` |
| WASM target | -- | `rustup target add wasm32v1-none` |
| Node.js | 24+ | [nodejs.org](https://nodejs.org) |
| Docker | 24+ | [docker.com](https://docker.com) |
| Stellar Testnet account | -- | Fund via [Friendbot](https://lab.stellar.org/) |
| Freighter extension | latest | [freighter.app](https://freighter.app) |

### 1. Build Contracts

```bash
cd contracts
cargo build --target wasm32v1-none --release
```

Expected WASM artifacts (in `contracts/target/wasm32v1-none/release/`):

| Contract | File |
|----------|------|
| EquipmentRegistry | `equipment_registry.wasm` |
| MaintenanceRecords | `maintenance_records.wasm` |
| MultiPartyApproval | `multi_party_approval.wasm` |
| ComplianceAttestation | `compliance_attestation.wasm` |
| IdentityRegistry | `identity_registry.wasm` |

> **Use release WASM for deployment.** Debug WASM artifacts can exceed the Soroban RPC payload limit (HTTP 413).

Run contract unit tests:

```bash
cd contracts
cargo test                         # All contracts
cargo test -p multi-party-approval # Single contract
```

### 2. Start Postgres

```bash
docker compose -f infra/docker-compose.yml up -d
```

Starts Postgres 16 on port 5432 (user/password/database: `maintchain`).

### 3. Run Backend

```bash
cd backend
export DATABASE_URL="postgres://maintchain:maintchain@localhost:5432/maintchain"
export GLITCHTIP_DSN="https://d50984aebbe547c1af84ff919ccedb62@app.glitchtip.com/27052"
cargo run
```

The backend listens on `http://127.0.0.1:8081`.

Optional — after deploying contracts, set the IdentityRegistry address so verification rows record the real contract ID (if unset, `user_verifications.verification_contract_id` stores `'unknown'`):

```bash
export IDENTITY_REGISTRY_CONTRACT_ID=<contract_id>
```

**Health check:**

```bash
curl http://localhost:8081/health
# {"status":"ok"}
```

**Seed demo data:**

```bash
cargo run --bin seed
```

### 4. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_API_URL=http://localhost:8081

# Error tracking (GlitchTip — optional in dev)
NEXT_PUBLIC_GLITCHTIP_DSN=https://d50984aebbe547c1af84ff919ccedb62@app.glitchtip.com/27052
```

Optional — after deploying contracts:

```env
# Contract addresses (see Deploying Contracts section)
NEXT_PUBLIC_EQUIPMENT_REGISTRY_ID=<contract_id>
NEXT_PUBLIC_MAINTENANCE_RECORDS_ID=<contract_id>
NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID=<contract_id>
NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID=<contract_id>
NEXT_PUBLIC_IDENTITY_REGISTRY_ID=<contract_id>

# Auth (server-side only — NO NEXT_PUBLIC_ prefix, set in Vercel env vars)
BACKEND_URL=http://localhost:8081          # Rust backend URL
MAINTCHAIN_API_KEY=<shared_secret>        # Must match backend
AUTH_SECRET=<random_hmac_secret>          # For signing session cookies


```

Start dev server:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

### 5. Freighter Wallet

1. Install [Freighter](https://www.freighter.app/) browser extension
2. Create or import a Stellar Testnet account
3. Fund the account via [Friendbot](https://lab.stellar.org/)
4. Open MaintChain frontend -> click **Connect Wallet**
5. Confirm the authorization prompt

The dashboard displays your Stellar address, XLM balance (from Horizon Testnet), and network status.

### 6. Register & Get Verified (User Guide)

The platform has two onboarding flows. **Register** (`/register`) creates your off-chain profile row in Postgres. **Get Verified** (`/get-verified`) proves your identity on-chain by writing your role, organization, and SHA-256 identity hashes to the `IdentityRegistry` Soroban contract.

Both flows require the two-layer session: after connecting Freighter you must **approve the SEP-53 signature challenge** — this issues the HttpOnly cookie that authorizes backend writes on your behalf.

**Prerequisites:** Freighter extension, a funded Stellar Testnet account ([Friendbot](https://lab.stellar.org/)), and the backend + frontend running locally (see Setup above).

#### Register (`/register`)

1. Open `http://localhost:3000/register`
2. Click **Connect Wallet** → approve Freighter's access request
3. Approve the **signature challenge** (SEP-53) when prompted
4. Enter your **Full Name** (required)
5. Select a **Role** — exactly one of the four DB-authorized values: `TECHNICIAN`, `SUPERVISOR`, `AUDITOR`, `OWNER`

   > The backend `users_role_check` constraint accepts only these four uppercase values. Roles are centralized in `frontend/src/lib/roles.ts` and drift-guarded against the SQL migration by `roles.test.ts` plus the standalone `scripts/check-role-drift.mjs` CI check.

6. Enter **Organization** (optional)
7. Click **Register on MaintChain**

**Expected outcomes:**

- **Success:** green "Registration Complete" screen showing your wallet address and role badge.
- **Wallet already registered:** the page detects this via `GET /users/:address` and shows an **Already Registered** panel (with links to Dashboard and Get Verified) instead of the form. The backend also returns `409 Conflict` — never a 500 — for a duplicate `POST /users` (the `users_stellar_address_key` unique violation).

#### Get Verified (`/get-verified`)

A 7-stage flow that ends with an on-chain identity record:

1. Open `http://localhost:3000/get-verified` → click **Start Verification**
2. Connect Freighter (Testnet) and approve the signature challenge
3. Backend readiness check — must report `database_ready: true`
4. **Profile lookup** (`GET /users/:address`): `404` (not registered yet) → "Create Your Identity Profile" form appears; `200` (already registered) → jumps straight to Review & Execute
5. Fill name/role/org if the form appeared, then **Create Profile & Continue**
6. On the **Review** screen, click **Sign Verification Transaction** and approve it in Freighter (pays a small amount of testnet XLM for gas)
7. Wait for confirmation → **success screen** with your transaction hash and a **View on Stellar Expert** link (`https://stellar.expert/explorer/testnet/tx/<hash>`)

**Under the hood:** the page computes `orgHash = SHA-256(organization)` and `profileHash = SHA-256(JSON{stellar_address, name, role, organization})`, then calls `IdentityRegistry.verify_identity(address, roleCode, orgHash, profileHash)` through the invokeContract pipeline (simulate → sign → submit → poll). On success the result is mirrored to `POST /verification` (the `user_verifications` table).

**Error states (all user-visible, non-crashing):**

| State | Cause | What you see |
|-------|-------|--------------|
| `Freighter Required` | Extension not detected | Error panel with install guidance |
| `Wrong Network` | Wallet on mainnet/public | Switch to Testnet in Freighter |
| `Backend Unavailable` | `/verification/readiness` DB check failed | Retry after starting backend |
| `Contract Not Configured` | `NEXT_PUBLIC_IDENTITY_REGISTRY_ID` unset | Set it in `frontend/.env.local` |
| `User Lookup Failed` | Non-404 error from `GET /users/:address` (5xx/network) | Error panel with Try Again |
| `Signature Rejected` | You declined in Freighter | Re-approve on retry |
| `Simulation Failed` | Contract call simulation error | Verify the contract ID is the deployed IdentityRegistry |
| `Confirmation Timeout` | Submitted but not confirmed within 15s of polling | Hash + Stellar Expert link + "Check again" |

---

## Usage

### REST API

**Equipment:**

```bash
# Register
curl -X POST http://localhost:8081/equipment \
  -H "Content-Type: application/json" \
  -d '{"equipment_id":"MCH-1104","owner_id":"00000000-0000-0000-0000-000000000001"}'

# List all
curl http://localhost:8081/equipment
```

**Maintenance Records:**

```bash
# Create order
curl -X POST http://localhost:8081/maintenance/orders \
  -H "Content-Type: application/json" \
  -d '{"equipment_id":"MCH-1104","technician_id":"00000000-0000-0000-0000-000000000002"}'

# Submit evidence (SHA-256 hash)
curl -X POST http://localhost:8081/maintenance/<id>/evidence \
  -H "Content-Type: application/json" \
  -d '{"evidence_hash":"0x8f2cabd91e4d2a7c9014e1c1a3b5f6d8e0f2a4c6e8a0b2c4d6e8f0a2b4c6e8"}'
```

**Approvals:**

```bash
# Supervisor approve
curl -X POST http://localhost:8081/maintenance/<id>/approvals/supervisor \
  -H "Content-Type: application/json" \
  -d '{"decision_note":"Evidence verified, parts traceable"}'

# Supervisor reject
curl -X POST http://localhost:8081/maintenance/<id>/approvals/supervisor/reject \
  -H "Content-Type: application/json" \
  -d '{"decision_note":"Missing torque readings"}'

# Auditor certify
curl -X POST http://localhost:8081/maintenance/<id>/approvals/auditor \
  -H "Content-Type: application/json" \
  -d '{"decision_note":"Compliance verified, all approvals complete"}'
```

**Audit Trail:**

```bash
curl http://localhost:8081/maintenance/<id>/audit
```

**Hash Utility:**

```bash
curl -X POST http://localhost:8081/hash/evidence \
  -H "Content-Type: application/json" \
  -d '{"payload":"<any string>"}'
# {"evidence_hash":"<64 hex chars>"}
```

### Frontend Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page: Hero, Trust Replay, stats, network feed |
| `/live-network` | Real-time activity feed with filtering |
| `/workers` | Worker discovery: search, filter, sort by trust/experience |
| `/workers/:slug` | Worker profile: reputation, skills, reviews, history |
| `/machines` | Machine passport directory |
| `/machines/:id` | Machine detail with event timeline |
| `/certificates` | Certificate registry |
| `/certificates/:id` | Certificate detail with approval chain |
| `/get-verified` | Identity verification (7-stage flow) |
| `/leaderboard` | Global trust rankings |
| `/industries` | Industry coverage |
| `/dashboard` | Worker dashboard: trust score, weekly rank, activity |
| `/upload` | Evidence upload with drag-drop zone |
| `/approve` | Supervisor approval center |
| `/audit` | Audit timeline with certificate issuance |
| `/technician` | Technician task list |
| `/register` | User registration with wallet connect |
| `/users` | Registered user directory |
| `/feedback` | Feedback collection with star ratings |
| `/technical-preview` | Phase 1 "What to Test" guide for the six compliance stages |
| `/docs` | Documentation placeholder page |
| `/privacy` | Privacy policy placeholder page |
| `/terms` | Terms of service placeholder page |
| `/contact` | Contact placeholder page |

### Deploying Contracts

```bash
# Prerequisites: WASM files built, deployer key set
export DEPLOYER_SECRET_KEY="S<your_testnet_secret_key>"
node scripts/deploy-contracts.mjs
```

The script uploads each WASM blob to Soroban RPC, deploys the contract, and prints contract IDs with `.env.local` entries.

> The IdentityRegistry address in the table below is the one currently wired in `frontend/.env.local` (its `verify_identity` simulation was verified against the live Testnet RPC). Re-deploying changes these IDs — update `frontend/.env.local` and the backend `IDENTITY_REGISTRY_CONTRACT_ID` to match.

**Current Testnet deployments:**

| Contract | Address |
|----------|---------|
| IdentityRegistry | `CA2CSUN5T4ZJZHQ562XFHB2WVSGE2E7KS4NJ2SBFJM6CLRZIFLJP4EMC` |
| MultiPartyApproval | `CDGJ6VX3TG4M66SBFS5LCBPTF26GEFRZXXAYNYAWYRYHG2WDJ7UYAZSC` |
| EquipmentRegistry | `CBTOLJE5FVYO4Y473OIZIBX3OAAZAKCRODZ4LI56Q5UYMQTXRUSVC2EO` |
| MaintenanceRecords | `CDZ324UZJCIKG32YKY4MFZX5AO63VXCK73NO5QS3QI3256UDBYR5LP6M` |
| ComplianceAttestation | `CDDMPFXM3DMXZBMKBQR4UBSOXB5XZIDLVAJGX3L7D4C6TTFXGKY7EGU2` |

---

## Validation

### Contract Tests

```bash
cd contracts
cargo test                              # All contracts
cargo test -p equipment-registry        # Single contract: registration, versioning, ownership
cargo test -p identity-registry         # Verification, re-verification, wallet isolation
cargo test -p multi-party-approval      # All approval flow combinations
cargo test -p compliance-attestation    # Certification flow + error paths
```

Snapshot tests stored in `contracts/*/test_snapshots/tests/`.

### Backend

```bash
cd backend
cargo check --release                   # Type-check only (fast)
cargo build --release                   # Full build
# Then start backend + Postgres, verify:
curl http://localhost:8081/health
curl http://localhost:8081/health/config
```

### Frontend

```bash
cd frontend
npm run build                           # TypeScript type-check + production build (24 pages)
npm run lint                            # ESLint
```

### End-to-End Demo Scenario

Exercises all six compliance stages:

1. Register equipment (POST `/equipment`)
2. Create maintenance order (POST `/maintenance/orders`)
3. Submit evidence with hash (POST `/maintenance/:id/evidence`)
4. Supervisor approval + rejection path (POST `/maintenance/:id/approvals/supervisor`)
5. Audit trail retrieval (GET `/maintenance/:id/audit`)
6. Compliance certificate issuance (POST `/maintenance/:id/approvals/auditor`)

### Get Verified Demo (7-Stage Flow)

See [User Guide: Register & Get Verified](#6-register--get-verified-user-guide) for the full walkthrough, error states, and expected outcomes. Happy-path summary:

1. Open `/get-verified` → click **Start Verification**
2. Connect Freighter wallet (Stellar Testnet) + approve the SEP-53 signature challenge
3. Confirm balance visible; backend readiness check passes
4. Profile lookup: `404` → registration form; `200` → straight to Review & Execute
5. Sign `IdentityRegistry.verify_identity` transaction in Freighter
6. Wait for confirmation → success page with tx hash + Stellar Expert link

---

## Results

### Visual Design System

The frontend implements an **Editorial + Glass** aesthetic:

- **Editorial masthead**: Numbered sections (01-08) with monospace identifiers, "Edition 47" strip, Soroban ledger indicators
- **Glass components**: Frosted surfaces (`backdrop-filter: blur(20px)`), hairline borders, subtle box shadows with blue/green glow variants
- **CSS variable system**: All colors, borders, and shadows through custom properties in `globals.css`
- **Responsive**: Slide-out mobile navigation, adaptive grid layouts, touch-friendly targets
- **Animations**: Sub-300ms transitions on hover, `fadeSlideUp` notifications, `slideIn` mobile nav

All landing page components pass visual inspection with zero console errors (verified at 768px and 1280px viewports).

![Live Webpage](Live_webpage.png)

![Mobile Responsive](Mobile-responsive-proof.png)

### Contract Coverage

- **EquipmentRegistry**: 3 unit tests (registration, version retrieval, owner transfer via snapshots)
- **MaintenanceRecords**: CRUD operations for the state machine
- **MultiPartyApproval**: Approval bitmap with configurable auditor requirement (18 scenarios)
- **ComplianceAttestation**: Certificate issuance with fully wired cross-contract calls (4 tests: full flow, not-eligible, ineligible status, not-found)
- **IdentityRegistry**: 6 unit tests (verification, pre-verification state, re-verification version bumps, field preservation, wallet isolation, state transitions)

### Monitoring

MaintChain integrates **GlitchTip** for error tracking (Sentry-compatible SDK):
- **Frontend**: `@sentry/nextjs` -- JS errors, unhandled rejections, performance (1% sample rate).
- **Backend**: sentry + sentry-tower -- server errors, request performance. Configurable via `GLITCHTIP_DSN`.
- **User Feedback**: Floating widget (`FeedbackButton`) submits context-rich feedback to GlitchTip.
- **Source Maps**: Uploaded via GlitchTip CLI in CI/CD for readable production stack traces.

### Community Feedback & Testing

MaintChain is currently in its Technical Preview phase. Users are encouraged to test the platform, submit feedback, and help validate the compliance workflow.

[Submit Feedback](https://forms.gle/fo1wwygKWCd1TuXw9) · [View Responses](https://docs.google.com/spreadsheets/d/1lUUscN6XLueZiq5D9E4bB--CUR9ZRT0xjNcD2pyZK6Q/edit?usp=sharing)

- **Google Form** — Submit feedback on registration, wallet connection, identity verification, maintenance workflows, and overall UX.
- **Google Sheet** — Browse collected responses from testers and community participants.

---

## Deployment

### Infrastructure

| Service | Platform | Configuration |
|---------|----------|---------------|
| Frontend | Vercel | Auto-deployed from `main` via GitHub Actions (Vercel prebuilt CLI flow) |
| Backend | Render | Docker container (see Dockerfile, render.yaml) |
| Database | Supabase | PostgreSQL 16 via connection pooler |
| Smart Contracts | Stellar Testnet | 5 Soroban contracts (addresses above) |
| Error Tracking | GlitchTip | Frontend + backend (Sentry-compatible SDK) |

### CI/CD

- **CI** (`.github/workflows/ci.yml`): TypeScript lint + test + build, Rust check + build, contract tests + WASM build, plus guards for migration placement/numbering, role-list drift, contract workspace membership, and deploy-script ↔ workspace references
- **Deploy** (`.github/workflows/deploy.yml`): Vercel prebuilt flow on push to `main`; Render deploy hook for backend

**Environment variables required in GitHub Secrets:**

| Secret | Used By |
|--------|---------|
| `VERCEL_TOKEN` | Frontend deploy |
| `VERCEL_ORG_ID` | Frontend deploy |
| `VERCEL_PROJECT_ID` | Frontend deploy |
| `RENDER_DEPLOY_HOOK_URL` | Backend deploy (optional) |
| `GLITCHTIP_AUTH_TOKEN` | GlitchTip source map upload (optional) |

---

## Limitations

1. **Cross-contract invocation is wired.** `ComplianceAttestation.issue_certificate` invokes `MultiPartyApproval.verify` and `MaintenanceRecords.complete` via `env.invoke_contract` with short symbols (`symbol_short!`), avoiding the WASM export symbol-length limit. Covered by 4 unit tests including the full certification flow.

2. **Soroban RPC dependency.** The frontend's `invokeContract` helper polls `getTransaction` up to 15 times (15-second timeout). RPC latency or unavailability causes contract call failures. The UI now surfaces every outcome — `pending` shows the poll attempt count ("Confirming on-chain — attempt 4/15"), `timeout` shows the transaction hash with a Stellar Expert link and a manual "Check again" re-poll, and `failed` shows the actual reason. Automated retry-with-backoff queuing is deliberately out of scope for Phase 1.

3. **Off-chain evidence storage.** The backend stores evidence hashes but not the evidence files themselves. A production deployment would need IPFS, S3, or equivalent for media storage.

4. **API authentication is partially production-ready.** A two-layer auth system (MAINTCHAIN_API_KEY + session cookie) is fully implemented in the Next.js proxy and backend middleware. CORS is restricted to an explicit `ALLOWED_ORIGINS` allow-list (comma-separated env var; `http://localhost:3000` dev fallback) with GET/POST methods only. The proxy's `AUTH_SECRET` must be set to a cryptographically random value in production.

5. **Database URL handling.** The backend appends `?sslmode=require` to Postgres connection strings that use a plain `postgres://` scheme (no SSL params present). This works for Supabase and standard Postgres but may conflict with connection poolers.

6. **Placeholder pages.** Routes `/docs`, `/privacy`, `/terms`, `/contact` render generic placeholders.

7. **Demo data is hardcoded.** Worker profiles, machine metadata, certificates, and leaderboard entries are defined in `frontend/src/data/maintchain.ts`. A production system would hydrate these from the API.

8. **Soroban SDK version.** Contracts target SDK 26.1.0 (previously v21). The symbol-length note that used to apply to v21 export names no longer blocks cross-contract calls, which use short `symbol_short!` names.

---

## Contributing

### Code Conventions

- **Rust contracts**: `no_std`, Soroban SDK v26 patterns. Tests use `soroban_sdk::testutils`.
- **Rust backend**: Axum handlers in separate modules. SQL queries inline (no ORM). Migrations in `backend/migrations/`.
- **TypeScript frontend**: Next.js 14 App Router. Design system via CSS variables in `globals.css`. UI components in `src/components/maintchain/`.
- **API**: RESTful plural nouns, POST for mutation, GET for reads. Structured error responses (`ApiErrorResponse`).

### Development Workflow

```bash
# 1. Build contracts
cd contracts && cargo build --target wasm32v1-none --release

# 2. Run contract tests
cd contracts && cargo test

# 3. Start Postgres
docker compose -f infra/docker-compose.yml up -d

# 4. Run backend
cd backend && cargo run

# 5. Run frontend
cd frontend && npm run dev

# 6. Verify production build
cd frontend && npm run build
```

### Design System Variables

Color, spacing, and glass effects are controlled through CSS custom properties in `frontend/src/app/globals.css`:

```css
:root {
  --surface: #ffffff;
  --nav: #0f172a;
  --primary: #2563eb;
  --glass-surface: rgba(255, 255, 255, 0.78);
  --glass-shadow: 0 1px 0 rgba(255, 255, 255, 0.95) inset,
                  0 8px 32px rgba(15, 23, 42, 0.07);
}
```

---

## License

Provided for demonstration and evaluation purposes. No license specified -- see the repository owner for usage terms.
