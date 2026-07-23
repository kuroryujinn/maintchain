# MaintChain — A Verifiable Trust Network for Industrial Maintenance

> **Thesis:** MaintChain makes industrial maintenance records provably tamper-proof by enforcing a multi-party cryptographic approval workflow on Stellar Soroban smart contracts — technician submits evidence, supervisor verifies, auditor certifies — with every approval permanently recorded on-chain and no single party able to rewrite history.

**Supporting documents:**
- [📘 Project Guide & Use Cases](./PROJECT_GUIDE.md) — Whitepaper: problem analysis, stakeholder model, industry scenarios, market sizing
- [🏗️ System Architecture & Design](./SYSTEM_DESIGN.md) — Architecture decisions, component deep-dives, security model, trade-off analysis
- [🔗 Stellar SDK & Contract Integration](./STELLAR_INTEGRATION.md) — Soroban contract internals, SDK usage, deployment pipeline, known limitations

---

## Abstract

Industrial maintenance records — repair logs, inspection reports, compliance certificates — form the backbone of safety and regulatory compliance across aviation, energy, manufacturing, and maritime sectors. Yet these records remain fundamentally **mutable**: paper logs can be altered, central databases can be modified by administrators, and single-party approvals create single points of failure. The consequence is an estimated **$10B+ annually** in fraud-related costs across these sectors.

MaintChain closes this gap through a **multi-party cryptographic approval workflow** executed on Stellar Soroban smart contracts. The system enforces that a maintenance record is only considered compliant after three independent roles — technician, supervisor, and optionally auditor — have each signed off on-chain. Evidence files remain off-chain; only SHA-256 hashes are stored on-chain for proof-of-existence. The full stack includes four Soroban smart contracts (Rust, `no_std`), an Axum REST backend (Rust, PostgreSQL), a Next.js 14 frontend with Freighter wallet integration, and automated contract deployment and integration-test scripts.

The system is deployed on Stellar Testnet with all four contracts verified, a production-grade frontend on Vercel, and a containerized backend on Render.

---

## Problem

### The Scale of Record Fraud

| Sector | Annual Fraud Cost | Key Risk |
|--------|------------------|----------|
| Aerospace | $4.2B (parts counterfeiting) | Safety-critical failures |
| Oil & Gas | $2.8B (compliance falsification) | Environmental disasters |
| Manufacturing | $1.9B (warranty fraud) | Liability exposure |
| Maritime | $1.1B (certificate forgery) | Port detention |

*Source: Industry estimates aggregated 2024–2025.*

### Why Current Systems Fail

**Paper-based logs** can be physically altered, lost, or destroyed with no forensic trace. **Centralized databases** are controlled by a single organization; any operator or administrator with database access can modify records, and audit logs can be truncated. **Single-party approval workflows** mean that one compromised credential can falsify an entire inspection record. **Siloed reputation** prevents a technician's work history from traveling across employers — a skilled welder with a flawless record at one plant starts from zero credibility at the next.

The fundamental gap is **incentive incompatibility**: no existing system chains approvals together in a way that makes falsification provably expensive and honest work provably cheap to verify.

### The Cost of Verification

Without on-chain attestations, verifying a maintenance history requires:
1. Requesting records from the equipment owner (days turnaround)
2. Cross-referencing against parts suppliers and repair logs (hours of manual work)
3. Trusting that the provided records have not been altered (no cryptographic proof)

With MaintChain, verification takes **under 30 seconds**: query the on-chain approval bitmap, check the evidence hash, and read the certificate attestation — no API keys, no data access requests, no trust required.

---

## Approach

### Architecture: Dual-Path On-Chain / Off-Chain

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js 14)                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  useSoroban() Hook ────── Soroban RPC ──── Stellar Testnet   │  │
│  │  api.ts REST Client ───── HTTP :8081 ───── Backend (Axum)    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Dual independent paths:                                            │
│  • On-chain: Freighter → Soroban RPC → contracts (approvals,       │
│    evidence hashes, certificates)                                   │
│  • Off-chain: fetch API → Axum → PostgreSQL (profiles, metadata,    │
│    audit trail supplements, user management)                        │
└─────────────────────────────────────────────────────────────────────┘
```

The architecture follows a **dual-path pattern** with a clear on-chain/off-chain boundary:

| Concern | Location | Rationale |
|---------|----------|-----------|
| Approval state (tech/supervisor/auditor) | On-chain (MultiPartyApproval) | Immutable — no single party rewrites history |
| Evidence hashes | On-chain (MaintenanceRecords) | Proof-of-existence without storing files on-chain |
| Equipment ownership chain | On-chain (EquipmentRegistry) | Verifiable chain of custody across transfers |
| Compliance certificates | On-chain (ComplianceAttestation) | Permanently verifiable by any party |
| Evidence files (photos, PDFs) | Off-chain (IPFS / backend) | Cost-prohibitive on-chain |
| Worker profiles, reviews | Off-chain (PostgreSQL) | High churn, not safety-critical |
| Machine metadata | Off-chain (PostgreSQL) | Frequently updated, searchable |
| Audit trail logs | Off-chain (PostgreSQL) | Supplementary to on-chain approvals |
| Transaction lifecycle events | Off-chain (PostgreSQL, tx_log table) | RPC latency monitoring, retry tracking |

### Smart Contracts (4 crates)

Each contract is an independent Soroban crate compiled to WASM (`wasm32v1-none`). All contracts emit Soroban events for transaction lifecycle tracking.

**EquipmentRegistry** — Registers equipment with versioned snapshot history. Each ownership transfer creates a new snapshot with a self-certifying hash: `SHA256("EQUP" || id || metadata_hash || created_at || version)`. Enables unbroken chain of custody without centralized registry.

**MaintenanceRecords** — State machine for individual maintenance jobs: `Open → Submitted → PendingApproval → Compliant → Rejected`. Evidence hashes are attached at submission. Exposes `update_status` for cross-contract calls from the approval engine. Emits `evidence`, `status`, and `complete` events.

**MultiPartyApproval** — The enforcement point. Tracks a per-record approval bitmap across three roles (technician, supervisor, auditor) with configurable auditor requirement. `verify_compliance` returns `true` only when all required approvals are satisfied. Emits `approve`, `reject`, and `audit` events.

**ComplianceAttestation** — Issues final certificates via cross-contract calls. Verifies compliance by calling MultiPartyApproval, then transitions MaintenanceRecords to Compliant. Emits `certify` events. This is the terminal artifact of the compliance workflow.

### Transaction State Machine (Frontend)

Every on-chain operation (evidence submission, approval, certification) flows through a typed state machine with 16 states:

```
Forward:    IDLE → PREPARING → SIMULATING → WAITING_FOR_SIGNATURE
            → SUBMITTING → PENDING → CONFIRMED → DATABASE_SYNC → COMPLETE

Failure:    SIMULATION_FAILED, SIGNATURE_REJECTED, RPC_ERROR,
            INSUFFICIENT_BALANCE, CONTRACT_REVERT, TIMEOUT,
            DATABASE_SYNC_FAILED
```

Retryable failures (RPC errors, timeouts, DB sync failures) support exponential-backoff retry with configurable max attempts (default: 3). Non-retryable failures (signature rejection, insufficient balance, contract revert) terminate immediately. A visual `TransactionProgress` component with a 7-step progress indicator gives users real-time feedback.

### Challenge-Response Wallet Authentication

Wallet ownership is verified via a challenge-response protocol:
1. Frontend requests a random nonce from `POST /api/auth/challenge`
2. Frontend signs the nonce message with Freighter (embedded in a minimal transaction memo)
3. Backend verifies the ed25519 signature against the Stellar public key using `stellar-strkey`
4. Backend returns an HMAC-SHA256 session token with 24-hour expiry

Nonces are single-use with 5-minute TTL, stored in the `challenge_nonces` table.

### Retry Strategy for RPC Calls

The Node.js helper script (`scripts/soroban-invoke.mjs`) wraps all Soroban RPC fetches with `fetchWithRetry`: exponential backoff (1s, 2s, 4s; cap 8s), retryable on HTTP 408/429/5xx, idempotency keys for `sendTransaction` to prevent duplicate submissions on network retries.

---

## Repository Layout

```
.
├── PROJECT_GUIDE.md               # Whitepaper — problem, use cases, stakeholders
├── SYSTEM_DESIGN.md                # Architecture — component deep-dives, data flows
├── STELLAR_INTEGRATION.md          # Stellar SDK — contract internals, deployment
├── .github/workflows/              # CI/CD — GitHub Actions (ci.yml, deploy.yml)
│
├── backend/                        # Rust (Axum) REST API
│   ├── Cargo.toml                  # Axum, sqlx, soroban-sdk, sentry, ed25519-dalek
│   ├── src/
│   │   ├── main.rs                 # Router, handlers, CORS, DB pool, Sentry
│   │   ├── auth.rs                 # POST /api/auth/challenge, /api/auth/verify
│   │   ├── audit.rs                # GET /maintenance/:id/audit, auditor approval
│   │   ├── complaint.rs            # Compliance transition logic
│   │   ├── soroban_client.rs       # Soroban RPC wrapper, ed25519 verification
│   │   ├── storage.rs              # File hashing + IPFS upload (Pinata)
│   │   ├── tx_log.rs               # Transaction logging + POST/GET /api/tx-log
│   │   ├── seed.rs                 # Database seeder
│   │   └── seed_main.rs            # Binary entry point for seeding
│   └── migrations/
│       ├── 0001_init.sql           # Tables: equipment, maintenance_records, approvals
│       ├── 0002_blockchain_integration.sql  # Contract address + tx_id columns
│       └── 0005_transaction_log.sql         # Transaction log table + tx_status enum
│       └── 0006_challenge_nonces.sql        # Challenge nonces for auth
│
├── contracts/                      # Soroban smart contracts (Rust, no_std)
│   ├── Cargo.toml                  # Workspace with 4 members
│   ├── equipment-registry/         # Versioned equipment snapshots + ownership
│   ├── maintenance-records/        # Maintenance order state machine + events
│   ├── multi-party-approval/       # Approval bitmap + compliance check + events
│   └── compliance-attestation/     # Certificate issuance + cross-contract + events
│
├── frontend/                       # Next.js 14 (App Router) + Tailwind v4
│   ├── package.json                # next 14.2, react 18, stellar-sdk 13, freighter-api 6
│   ├── src/
│   │   ├── app/                    # 18 route pages (App Router)
│   │   │   ├── page.tsx            # Landing: Hero, TrustReplay, Stats, Comparison
│   │   │   ├── dashboard/          # Worker dashboard with SVG metrics
│   │   │   ├── upload/             # Evidence upload with transaction state machine
│   │   │   ├── approve/            # Supervisor approval with state machine
│   │   │   ├── audit/              # Audit timeline with certificate issuance
│   │   │   ├── technician/         # Technician task list
│   │   │   ├── workers/            # Worker discovery + profiles
│   │   │   ├── machines/           # Machine passport directory
│   │   │   ├── certificates/       # Certificate registry
│   │   │   ├── live-network/       # Real-time activity feed
│   │   │   ├── leaderboard/        # Global trust rankings
│   │   │   ├── industries/         # Industry coverage
│   │   │   ├── register/           # User registration with wallet connect
│   │   │   ├── users/              # User directory with search/filter
│   │   │   ├── feedback/           # Feedback with 5-star ratings
│   │   │   └── docs, privacy, terms, contact/  # Coming soon
│   │   ├── components/
│   │   │   ├── maintchain/         # Component library (30+ components)
│   │   │   │   ├── ui.tsx          # EditorialSectionHeader, StatusBadge, ProfileCard
│   │   │   │   ├── Nav.tsx         # Navigation with mobile slide-out
│   │   │   │   ├── TransactionProgress.tsx  # Visual tx state machine + step indicator
│   │   │   │   ├── FadeInView.tsx   # Scroll-triggered animation wrapper
│   │   │   │   ├── TrustReplay.tsx  # 6-stage trust replay visualizer
│   │   │   │   ├── FeedbackButton.tsx  # User feedback collection widget
│   │   │   │   ├── SentryErrorBoundary.tsx  # Error boundary with Sentry
│   │   │   │   └── landing/        # 12 landing page components
│   │   │   ├── WalletConnectPanel.tsx    # Freighter connect + balance
│   │   │   └── ui/                # shadcn/ui components (button, card, dialog, etc.)
│   │   ├── data/
│   │   │   └── maintchain.ts       # Seed data: workers, machines, certificates
│   │   ├── hooks/
│   │   │   ├── useSoroban.ts       # Freighter auth, balance, contract calls, challenge-response
│   │   │   └── useTransactionState.ts  # 16-state tx lifecycle machine with retry
│   │   └── lib/
│   │       ├── api.ts              # Typed REST client for backend :8081
│   │       ├── api-types.ts        # Request/response schemas
│   │       ├── soroban.ts          # Contract invocation: simulate, sign, submit, poll
│   │       └── transaction-logger.ts  # Tx event logging to localStorage + API
│   └── next.config.js
│
├── scripts/
│   ├── deploy-contracts.mjs        # WASM upload + contract deploy to Soroban RPC
│   ├── soroban-invoke.mjs          # Node.js helper: build, sign, submit Soroban txs
│   ├── test-setup.mjs              # Creates test data on Testnet for integration tests
│   └── test-integration.mjs        # 5-test suite against deployed contracts
│
├── infra/
│   └── docker-compose.yml          # PostgreSQL 16 for local development
│
├── render.yaml                     # Render Blueprint for backend deployment
├── vercel.json                     # Vercel deployment configuration
└── Dockerfile                      # Multi-stage Rust build for backend container
```

---

## Setup

### Prerequisites

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Rust toolchain | nightly-2024-03+ (stable works for backend) | Backend compilation + Soroban WASM targets |
| `wasm32v1-none` | `rustup target add wasm32v1-none` | Soroban contract compilation |
| Node.js | 20+ | Frontend + deployment scripts |
| Docker | 24+ | Local PostgreSQL |
| Freighter browser extension | Latest | Stellar key management + transaction signing |
| Stellar Testnet account | Funded via [Friendbot](https://lab.stellar.org/) | Contract deployment + wallet testing |

### 1. Build Soroban Contracts

```bash
cd contracts
cargo build --target wasm32v1-none --release
```

Expected WASM artifacts (release builds — debug WASM can exceed RPC payload limits):

| Contract | Artifact Path |
|----------|---------------|
| EquipmentRegistry | `target/wasm32v1-none/release/equipment_registry.wasm` |
| MaintenanceRecords | `target/wasm32v1-none/release/maintenance_records.wasm` |
| MultiPartyApproval | `target/wasm32v1-none/release/multi_party_approval.wasm` |
| ComplianceAttestation | `target/wasm32v1-none/release/compliance_attestation.wasm` |

Run contract unit tests:
```bash
cd contracts
cargo test
# Or per-crate:
cargo test -p equipment-registry
```

### 2. Start PostgreSQL

```bash
docker compose -f infra/docker-compose.yml up -d
# Postgres 16 on :5432, user/pass/db: maintchain
```

### 3. Run Backend

```bash
cd backend
export DATABASE_URL="postgres://maintchain:maintchain@localhost:5432/maintchain"
cargo run
# Listens on http://127.0.0.1:8081
```

Health check:
```bash
curl http://localhost:8081/health
# → {"status":"ok"}
```

The backend auto-applies SQL migrations on startup (tables created if absent). To seed demo data:

```bash
cargo run --bin seed
```

### 4. Install Frontend

```bash
cd frontend
npm install
```

Configure `frontend/.env.local`:
```env
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_API_URL=http://localhost:8081

# After deploying contracts, add:
NEXT_PUBLIC_EQUIPMENT_REGISTRY_ID=<contract_id>
NEXT_PUBLIC_MAINTENANCE_RECORDS_ID=<contract_id>
NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID=<contract_id>
NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID=<contract_id>
```

Start dev server:
```bash
npm run dev
# Opens http://localhost:3000
```

### 5. Freighter Wallet Setup

1. Install [Freighter](https://www.freighter.app/) browser extension.
2. Create or import a Stellar Testnet account.
3. Fund via [Stellar Lab Friendbot](https://lab.stellar.org/).
4. Open MaintChain → **Connect Wallet** → confirm Freighter prompt.

The dashboard displays connected address, XLM balance (from Horizon Testnet), and network status.

---

## Usage

### REST API (Backend :8081)

**Equipment:**
```bash
curl -X POST http://localhost:8081/equipment \
  -H "Content-Type: application/json" \
  -d '{"equipment_id":"MCH-1104","owner_id":"00000000-0000-0000-0000-000000000001"}'
curl http://localhost:8081/equipment
```

**Maintenance Records:**
```bash
curl -X POST http://localhost:8081/maintenance/orders \
  -H "Content-Type: application/json" \
  -d '{"equipment_id":"MCH-1104","technician_id":"00000000-0000-0000-0000-000000000002"}'

curl -X POST http://localhost:8081/maintenance/<id>/evidence \
  -H "Content-Type: application/json" \
  -d '{"evidence_hash":"0x8f2cabd9..."}'
```

**Approvals:**
```bash
curl -X POST http://localhost:8081/maintenance/<id>/approvals/supervisor \
  -H "Content-Type: application/json" \
  -d '{"decision_note":"Evidence verified, parts traceable"}'

curl -X POST http://localhost:8081/maintenance/<id>/approvals/supervisor/reject \
  -H "Content-Type: application/json" \
  -d '{"decision_note":"Missing torque readings"}'
```

**Audit:**
```bash
curl http://localhost:8081/maintenance/<id>/audit

curl -X POST http://localhost:8081/maintenance/<id>/approvals/auditor \
  -H "Content-Type: application/json" \
  -d '{"decision_note":"Compliance verified — all approvals complete"}'
```

**Authentication (Challenge-Response):**
```bash
# Request nonce
curl -X POST http://localhost:8081/api/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"stellar_address":"G..."}'
# → {"nonce":"...","expires_at":"...","message":"..."}

# Verify signature (signed XDR from Freighter)
curl -X POST http://localhost:8081/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"stellar_address":"G...","nonce":"...","signature":"..."}'
# → {"verified":true,"token":"...","expires_at":"..."}
```

**Transaction Log:**
```bash
# List recent tx log entries
curl http://localhost:8081/api/tx-log?limit=20

# Filter by wallet
curl "http://localhost:8081/api/tx-log?wallet=G...&limit=10"
```

**Hash Utility:**
```bash
curl -X POST http://localhost:8081/hash/evidence \
  -H "Content-Type: application/json" \
  -d '{"payload":"<any string>"}'
# → {"evidence_hash":"<64 hex chars>"}
```

### Frontend Routes

| Route | Purpose | On-Chain Integration |
|-------|---------|---------------------|
| `/` | Landing: Hero, Trust Replay, stats, industry coverage | — |
| `/dashboard` | Worker dashboard with SVG metrics, compliance score | Compliance dashboard API |
| `/upload` | Evidence upload with drag-drop zone | `MaintenanceRecords.submit_evidence` |
| `/approve` | Supervisor approval center | `MultiPartyApproval.approve_by_supervisor` |
| `/audit` | Audit timeline + certificate issuance | `ComplianceAttestation.issue_certificate` |
| `/technician` | Technician task list | Maintenance records API |
| `/workers` | Worker discovery directory | Worker profiles API |
| `/machines` | Machine passport directory | Equipment registry |
| `/certificates` | Certificate registry | Attestation contract |
| `/live-network` | Real-time activity feed | Transaction log API |
| `/leaderboard` | Global trust rankings | Worker stats API |
| `/industries` | Industry coverage | — |
| `/register` | User registration with wallet connect | Users API |
| `/users` | User directory with search/filter | `GET /users`, `GET /users/count` |
| `/feedback` | 5-star rating feedback form | Sentry + feedback API |

### Deployed Contracts (Stellar Testnet)

| Contract | Address | Deploy TX |
|----------|---------|-----------|
| MultiPartyApproval | [`CBPH…JOYH`](https://lab.stellar.org/r/testnet/contract/CBPHZFRYKSE6PUWHU2HSNQTWBQ47GYV3U73KXPSOPIX3QLQJ7MLSJOYH) | [f637…ac53](https://stellar.expert/explorer/testnet/tx/f6378948f57e4d6555308c39e1e3cdc5e61522eb18119a84194299b8dda0ac53) |
| EquipmentRegistry | [`CAT5…WEW`](https://lab.stellar.org/r/testnet/contract/CAT57KYD2WU5QMNBSGB4FJQ37JUUQRKFDMZVPTJZVFC2H44EKWKZWWEW) | [037c…7863](https://stellar.expert/explorer/testnet/tx/037c5b9f2204df92e975111e9d7d96027b90b9ae26c89aaeccf595414fab7863) |
| MaintenanceRecords | [`CBRI…775Z`](https://lab.stellar.org/r/testnet/contract/CBRIGG27YRAXG5H74ZOWSSJGMSTPQHZXJCDXA23QSSBIH6VYZZR4775Z) | [bb8e…aae](https://stellar.expert/explorer/testnet/tx/bb8e10e0d5ce6d85e5019d5da8650e6cd1ec85c05f937041183c7097c1b06aae) |
| ComplianceAttestation | [`CBR4…VIN`](https://lab.stellar.org/r/testnet/contract/CBR4HHPWRDXMJJOG65B6I5TRIBBUFAXAMUCTAJANAPBAIJHPKRUTCVIN) | [295c…1ef](https://stellar.expert/explorer/testnet/tx/295cf00852671856ea524a69bafd2bc1c159a73d18ffc411749fc6312f11b1ef) |

Custom deployment:
```bash
export DEPLOYER_SECRET_KEY="S<your_testnet_secret>"
node scripts/deploy-contracts.mjs
```

---

## Validation

### Build Verification

```bash
# Backend: verify type correctness + dependency resolution
cd backend && cargo check

# Frontend: production build with type checking + linting
cd frontend && npm run build && npm run lint

# Contracts: unit tests
cd contracts && cargo test
```

### Integration Tests (against Testnet)

Requires env vars for deployed contract IDs and a funded deployer account:

```bash
export SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
export DEPLOYER_SECRET_KEY="S<your_secret>"
export NEXT_PUBLIC_EQUIPMENT_REGISTRY_ID="<id>"
export NEXT_PUBLIC_MAINTENANCE_RECORDS_ID="<id>"
export NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID="<id>"
export NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID="<id>"

# Step 1: Create test data (equipment + maintenance record)
node scripts/test-setup.mjs
# → Exports TEST_EQUIPMENT_ID, TEST_MAINTENANCE_ID, TEST_CERT_HASH

# Step 2: Run 5-test suite
export TEST_EQUIPMENT_ID="<from step 1>"
export TEST_MAINTENANCE_ID="<from step 1>"
node scripts/test-integration.mjs
```

Tests cover: equipment registration simulation, maintenance record retrieval, multi-party approval simulation (technician + supervisor), compliance attestation, and contract event emission verification.

### End-to-End Compliance Flow

A complete end-to-end scenario exercises:
1. Wallet connection (Freighter) → challenge-response verification
2. Equipment registration → maintenance order creation
3. Evidence upload with on-chain hash submission
4. Supervisor approval (on-chain via `approve_by_supervisor`)
5. Supervisor rejection path (on-chain via `reject_by_supervisor`)
6. Audit trail retrieval (on-chain mirrored to PostgreSQL)
7. Compliance certificate issuance (cross-contract: approval → attestation)

### Monitoring

- **Sentry** captures frontend JavaScript errors, backend Rust panics, and transaction performance traces (sample rate: 10%).
- **Transaction log** (`transaction_log` table) records every on-chain operation's lifecycle: simulation latency, submission status, retry count, and final outcome.
- **Health endpoint**: `GET /health` (liveness), `GET /health/config` (DB connection diagnostics with masked credentials).

---

## Results

### Design System

The frontend implements an **Editorial + Glass** aesthetic: numbered editorial sections (01–08), frosted glass surfaces (`backdrop-filter: blur(20px)`), hairline borders, and a CSS variable system for consistent theming. All 18 routes render correctly at 320px, 768px, 1024px, and 1280px viewports.

### Transaction Lifecycle Transparency

Every on-chain operation now surfaces a real-time progress indicator with 7 visual steps (Prepare → Simulate → Sign → Submit → Confirm → Sync → Done), explicit error states with retry capability, and blockchain explorer links for confirmed transactions. Failed operations are classified as retryable (RPC errors, timeouts) or terminal (contract revert, insufficient balance) with appropriate UX treatment.

### Auth Security

Wallet ownership verification uses the Stellar standard approach: embed a nonce in a transaction memo and verify the ed25519 signature server-side. Nonces are single-use with 5-minute TTL, preventing replay attacks. Session tokens use HMAC-SHA256 with a configurable server secret.

### Contract Coverage

All four contracts compile and pass Soroban SDK v21 build checks. Three contracts now emit standardized Soroban events (`approve`, `reject`, `evidence`, `certify`, `complete`, `status`, `audit`) for off-chain event indexing.

### Deployment

| Service | Platform | Configuration |
|---------|----------|---------------|
| Frontend | Vercel | Import repo → auto-deploy on push to main |
| Backend | Render | `render.yaml` Blueprint with Docker |
| Database | Supabase (Postgres 16) | Pooled connection via pooler.supabase.com |
| Smart Contracts | Stellar Testnet | 4 Soroban contracts with verified addresses |

---

## Limitations

1. **Cross-contract invocation depends on Soroban SDK symbol length.** The `ComplianceAttestation.issue_certificate` function calls `MultiPartyApproval.verify` and `MaintenanceRecords.complete` — function symbols must be ≤ 9 characters for SDK v21. The current deployment uses short symbols (`verify`, `complete`) that match.

2. **RPC polling has no fallback.** `invokeContract` polls `getTransaction` at 1s intervals for up to 15s. If the Soroban RPC endpoint is slow or unavailable, contract calls fail with no retry queuing at the frontend layer. The backend's Node.js helper implements retry, but the frontend uses direct Freighter → RPC calls.

3. **Evidence files are not stored by the backend.** The evidence hash is stored both on-chain and in PostgreSQL, but the uploaded file itself is only kept if Pinata (IPFS) is configured. Without Pinata credentials, the file is hashed and discarded.

4. **API authentication is not wired.** The `Authorization: Bearer` middleware (`API_KEY_ENV`) is implemented but not applied to any route. All endpoints are public when running in development mode.

5. **Demo data is hardcoded.** Worker profiles, machine metadata, certificates, and leaderboard entries are defined in `frontend/src/data/maintchain.ts`. A production system would hydrate these from the API.

6. **Rejection path does not update on-chain state.** When a supervisor rejects via the frontend, the `reject_by_supervisor` contract function is not called. The rejection is recorded in PostgreSQL but the on-chain approval bitmap still shows the previous state. This is a known gap between the backend and contract paths.

7. **Missing contract access control.** `MaintenanceRecords.update_status` and several MultiPartyApproval functions do not verify `env.invoker()`. Any caller can invoke these functions. Production deployment requires caller verification against known addresses.

8. **No CI/CD for contracts.** Contract deployment and WASM rebuilds are manual. CI/CD is configured for the frontend and backend only.

9. **Soroban SDK v21.** The contracts use SDK v21. SDK v22+ changed the cross-contract invocation API (`env.invoke_contract` signatures differ).

---

## Contributing

### Code Conventions

- **Rust contracts**: `no_std`, Soroban SDK v21. Tests use `soroban_sdk::testutils`. Short function symbols (≤ 9 chars) for cross-contract call compatibility.
- **Rust backend**: Axum handlers in separate modules per domain. SQL queries inline (no ORM). Migrations in `backend/migrations/` auto-applied on startup via `sqlx::Migrator`.
- **TypeScript frontend**: Next.js 14 App Router. CSS variables in `globals.css`. UI components in `frontend/src/components/maintchain/`. Data fetching via typed API client in `lib/api.ts`.
- **API**: RESTful plural nouns, POST for mutations, GET for reads. Structured error responses with `ApiErrorResponse` type.

### Development Workflow

```bash
# 1. Make changes
# 2. Run contract tests
cd contracts && cargo test

# 3. Verify backend compiles
cd backend && cargo check

# 4. Build frontend (type check + lint)
cd frontend && npm run build && npm run lint

# 5. Run integration tests (requires Testnet env)
node scripts/test-setup.mjs && node scripts/test-integration.mjs
```

### Design System Variables

All colors, borders, and glass effects are controlled through CSS custom properties in `frontend/src/app/globals.css`:

```css
:root {
  --background: #f4f6fa;
  --surface: #ffffff;
  --nav: #0f172a;
  --primary: #2563eb;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --glass-surface: rgba(255, 255, 255, 0.78);
  --glass-shadow: 0 1px 0 rgba(255, 255, 255, 0.95) inset,
                   0 8px 32px rgba(15, 23, 42, 0.07);
}
```

---

## License

This project is provided for demonstration and evaluation. No license is specified — see the repository owner for usage terms.
