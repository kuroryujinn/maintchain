# MaintChain

> A multi-party compliance platform for industrial maintenance records, powered by Stellar Soroban smart contracts. Every repair becomes a permanent, verifiable record that survives audits because it was never possible to falsify.

## Abstract

MaintChain prevents falsification of industrial maintenance records by enforcing a **multi-party approval workflow on-chain**. A maintenance record is only considered compliant after independent roles (technician, supervisor, optionally auditor) have recorded their approvals via Soroban smart contracts on Stellar Testnet. Evidence files remain off-chain; only cryptographic hashes are stored on-chain. The project ships a full stack: four Soroban contracts (Rust, `no_std`), an Axum REST backend (Rust, Postgres), a Next.js frontend with Freighter wallet integration, and a deployment script.

## Problem

Industrial maintenance records today are:
- **Mutable** — paper logs and spreadsheets can be altered after the fact.
- **Single-party** — one person's approval is rarely audited by independent roles.
- **Isolated** — a technician's reputation does not travel with them across employers or regions.
- **Expensive to audit** — verifying a repair history requires chasing down siloed records.

The gap is not technical capability but *incentive compatibility*: no existing system chains approvals together in a way that makes falsification provably expensive and honest work provably cheap to verify.

## Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js 14 + React 18 + Tailwind v4)              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Freighter wallet injection (window.freighter)        │  │
│  │  InvokeContract / SimulateContract helpers            │  │
│  │  REST API client (fetch → backend :8081)              │  │
│  └────────┬──────────────────────────────────┬───────────┘  │
│           │ Freighter                        │ fetch        │
│           ▼                                  ▼              │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │ Stellar Testnet      │    │ Backend (Axum + Postgres)  │ │
│  │ - Soroban contracts  │    │ - Equipment CRUD           │ │
│  │ - Horizon balance    │    │ - Maintenance orders       │ │
│  │ - Signed txs         │    │ - Supervisor approvals     │ │
│  └──────────────────────┘    │ - Audit trail             │ │
│                              │ - SHA-256 hashing         │ │
│                              └────────────────────────────┘ │
│                                                             │
│  The two paths are independent: the frontend calls Soroban  │
│  RPC directly via Freighter for on-chain operations, and    │
│  calls the backend REST API for off-chain CRUD workflows.  │
└─────────────────────────────────────────────────────────────┘
```

### Smart Contracts (4 crates)

Each contract is an independent Soroban crate compiled to WASM (`wasm32v1-none`):

1. **EquipmentRegistry** — Registers equipment with an owner, metadata hash, and versioned snapshot history. Ownership transfers create new versioned snapshots with distinct hashes. Each snapshot is self-certifying: the equipment hash is `SHA256(SEP || equipment_id || metadata_hash || created_at || version)`.

2. **MaintenanceRecords** — Stores maintenance orders with status enum (`Open → Submitted → PendingApproval → Compliant → Rejected`). Evidence hashes are attached at submission time. The contract exposes an `update_status` function intended to be callable by the approval engine.

3. **MultiPartyApproval** — Tracks approval state per maintenance ID across three roles: technician, supervisor, and optionally auditor. `verify_compliance` returns true only when all required approvals are satisfied. This is the enforcement point: no off-chain logic can mark a record compliant without the on-chain approval bitmap.

4. **ComplianceAttestation** — Issues a final certificate (attestation) containing the issuer address, cert hash, and timestamp. The `issue_certificate` function checks eligibility before minting the attestation. Cross-contract invocation to update `MaintenanceRecords` is scaffolded but not wired.

### Compliance Flow (6 stages)

```
Fault Detected → Worker Accepts → Evidence Uploaded
  → Evidence Verified → Approval Chain → Certificate Generated
```

Detailed per-stage data (asset, urgency, trust score, evidence media, part traceability) is defined in `frontend/src/data/maintchain.ts` as `TrustReplayStage[]`.

### Off-Chain / On-Chain Boundary

| Concern | Location | Rationale |
|---------|----------|-----------|
| Evidence files (photos, videos, PDFs) | Off-chain (IPFS / backend storage) | On-chain storage is prohibitively expensive for large files |
| Evidence hashes | On-chain (MaintenanceRecords) | Enables proof-of-existence without storing the file |
| Approval states | On-chain (MultiPartyApproval) | Immutable audit trail; no single party can rewrite history |
| Certificate attestation | On-chain (ComplianceAttestation) | Publicly verifiable; survives operator shutdown |
| Worker profiles, reviews, machine metadata | Off-chain (frontend data layer) | High churn; not safety-critical; cached from API |
| Audit trail (timestamped approval log) | Off-chain (Postgres) | Backend stores append-only approval log; on-chain mirror is planned but not wired |

## Repository Layout

```
.
├── backend/                          # Rust (Axum) REST API
│   ├── Cargo.toml                    # Dependencies: axum, sqlx, soroban-sdk, sha2
│   ├── src/
│   │   ├── main.rs                   # Router, handlers, CORS, DB pool
│   │   ├── audit.rs                  # GET /maintenance/:id/audit, POST auditor approval
│   │   ├── complaint.rs              # Compliance transition logic (stub)
│   │   ├── seed.rs                   # Database seeder (mirrors frontend demo data)
│   │   └── seed_main.rs              # Binary entry point for seeding
│   └── migrations/
│       ├── 0001_init.sql             # Tables: equipment, maintenance_records, approvals
│       └── 0002_blockchain_integration.sql  # Contract address + tx_id columns
│
├── contracts/                        # Soroban smart contracts (Rust, no_std)
│   ├── Cargo.toml                    # Workspace with 4 members
│   ├── equipment-registry/           # Equipment registration + versioned snapshots
│   ├── maintenance-records/          # Maintenance order state machine
│   ├── multi-party-approval/         # Approval state bitmap (tech/supervisor/auditor)
│   └── compliance-attestation/       # Certificate issuance + eligibility check
│
├── frontend/                         # Next.js 14 app (App Router)
│   ├── package.json                  # deps: next 14.2, react 18, stellar-sdk 13, freighter-api 6
│   ├── src/
│   │   ├── app/                      # Route pages (App Router)
│   │   │   ├── page.tsx              # Landing page (Hero, TrustReplay, Stats, etc.)
│   │   │   ├── dashboard/            # Worker dashboard with SVG metrics
│   │   │   ├── upload/               # Evidence upload with drag-drop zone
│   │   │   ├── approve/              # Supervisor approval center
│   │   │   ├── audit/                # Audit timeline with visual connected timeline
│   │   │   ├── workers/              # Worker discovery + profiles
│   │   │   ├── machines/             # Machine passport directory
│   │   │   ├── certificates/         # Certificate registry
│   │   │   ├── live-network/         # Real-time activity feed
│   │   │   ├── leaderboard/          # Global trust rankings
│   │   │   ├── industries/           # Industry coverage
│   │   │   ├── docs/                 # Placeholder (Q3 2026)
│   │   │   ├── privacy/              # Placeholder
│   │   │   ├── terms/                # Placeholder
│   │   │   └── contact/              # Placeholder
│   │   ├── components/
│   │   │   ├── maintchain/           # UI component library
│   │   │   │   ├── ui.tsx            # EditorialSectionHeader, StatusBadge, ProfileCard, etc.
│   │   │   │   ├── Nav.tsx           # Navigation with mobile slide-out
│   │   │   │   ├── FadeInView.tsx    # Scroll-triggered animation wrapper
│   │   │   │   ├── TrustReplay.tsx   # 6-stage trust replay visualizer
│   │   │   │   ├── RouteShell.tsx    # Layout shell with masthead strip
│   │   │   │   └── landing/          # 12 landing page components
│   │   │   ├── WalletConnectPanel.tsx # Freighter connect/disconnect + balance
│   │   │   └── Freighter.js          # Legacy Freighter integration
│   │   ├── data/
│   │   │   └── maintchain.ts         # Seed data: workers, machines, certificates, leaderboard
│   │   ├── hooks/
│   │   │   └── useSoroban.ts         # React hook: Freighter auth, balance, network, contract calls
│   │   └── lib/
│   │       ├── api.ts                # Typed REST client for backend :8081
│   │       ├── api-types.ts          # Request/response schemas
│   │       └── soroban.ts            # Contract invocation: simulate, sign, submit, poll
│   └── next.config.js
│
├── infra/
│   └── docker-compose.yml            # Postgres 16 for local development
│
├── scripts/
│   └── deploy-contracts.mjs          # WASM upload + contract deploy to Soroban RPC
│
├── stellar-connect-wallet/           # Standalone Freighter demo app (Create React App)
│
└── docs/                             # (Future) domain model, demo scenario, CI/CD docs
```

## Setup

### Prerequisites

| Dependency | Version | Notes |
|-----------|---------|-------|
| Rust toolchain | nightly-2024-03+ | For Soroban `no_std` WASM targets |
| `wasm32v1-none` target | — | `rustup target add wasm32v1-none` |
| Node.js | 20+ | For frontend and deploy script |
| Docker | 24+ | For local Postgres |
| Stellar Testnet account | — | Funded via [Stellar Lab Friendbot](https://lab.stellar.org/) |

### 1. Build Soroban Contracts

```bash
cd contracts
cargo build --target wasm32v1-none --release
```

Expected WASM artifacts:

| Contract | Path |
|----------|------|
| EquipmentRegistry | `target/wasm32v1-none/release/equipment_registry.wasm` |
| MaintenanceRecords | `target/wasm32v1-none/release/maintenance_records.wasm` |
| MultiPartyApproval | `target/wasm32v1-none/release/multi_party_approval.wasm` |
| ComplianceAttestation | `target/wasm32v1-none/release/compliance_attestation.wasm` |

> **Important:** Use **release** WASM for deployment. Debug WASM artifacts can exceed the Soroban RPC payload limit (HTTP 413). See `contracts/README.md`.

To run contract unit tests:

```bash
cd contracts
cargo test
```

Snapshot tests exist for `equipment-registry` (`test_snapshots/tests/`).

### 2. Start Postgres

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts Postgres 16 on port 5432 with user/password/database `maintchain`.

### 3. Run Backend

```bash
cd backend
# Environment variable priority: POSTGRES_URL > DATABASE_URL > default local
export DATABASE_URL="postgres://maintchain:maintchain@localhost:5432/maintchain"
cargo run
```

The backend listens on `http://127.0.0.1:8081`.

Health check:

```bash
curl http://localhost:8081/health
# → {"status":"ok"}
```

To seed demo data (mirrors the frontend's `maintchain.ts` seed data):

```bash
cargo run --bin seed
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 5. Configure Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_API_URL=http://localhost:8081
```

Optional — after deploying contracts, add the generated contract IDs (see Deployment section):

```env
NEXT_PUBLIC_EQUIPMENT_REGISTRY_ID=<contract_id>
NEXT_PUBLIC_MAINTENANCE_RECORDS_ID=<contract_id>
NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID=<contract_id>
NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID=<contract_id>
```

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

### 7. Freighter Wallet Setup

1. Install [Freighter browser extension](https://www.freighter.app/).
2. Create or import a Stellar Testnet account.
3. Fund the account via [Stellar Lab Friendbot](https://lab.stellar.org/).
4. Open the MaintChain frontend and click **Connect Wallet**.
5. Confirm the Freighter authorization prompt.

The dashboard displays the connected address, XLM balance (from Horizon Testnet), and network status.

## Usage

### REST API (Backend :8081)

**Equipment**

```bash
# Register equipment
curl -X POST http://localhost:8081/equipment \
  -H "Content-Type: application/json" \
  -d '{"equipment_id":"MCH-1104","owner_id":"00000000-0000-0000-0000-000000000001"}'

# List all equipment
curl http://localhost:8081/equipment
```

**Maintenance Records**

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

**Approvals**

```bash
# Supervisor approve
curl -X POST http://localhost:8081/maintenance/<id>/approvals/supervisor \
  -H "Content-Type: application/json" \
  -d '{"decision_note":"Evidence verified, parts traceable"}'

# Supervisor reject
curl -X POST http://localhost:8081/maintenance/<id>/approvals/supervisor/reject \
  -H "Content-Type: application/json" \
  -d '{"decision_note":"Missing torque readings"}'
```

**Audit**

```bash
# Get full audit trail
curl http://localhost:8081/maintenance/<id>/audit

# Issue compliance certificate (auditor)
curl -X POST http://localhost:8081/maintenance/<id>/approvals/auditor \
  -H "Content-Type: application/json" \
  -d '{"decision_note":"Compliance verified — all approvals complete"}'
```

**Hash Utility**

```bash
curl -X POST http://localhost:8081/hash/evidence \
  -H "Content-Type: application/json" \
  -d '{"payload":"<any string>"}'
# → {"evidence_hash":"<64 hex chars>"}
```

### Frontend Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page: Hero, Trust Replay, stats, comparison, network feed, featured workers, industries |
| `/live-network` | Real-time activity feed with filtering |
| `/workers` | Worker discovery: search, filter by industry, sort by trust/experience/response time |
| `/workers/:slug` | Full worker profile: reputation dimensions, skills, reviews, certificates, repair history |
| `/machines` | Machine passport directory |
| `/machines/:id` | Machine detail with event timeline and certificates |
| `/certificates` | Certificate registry |
| `/certificates/:id` | Certificate detail with approval chain and blockchain record |
| `/leaderboard` | Global trust rankings: top workers, trust growth, evidence quality, zero-complaint |
| `/industries` | Industry coverage (manufacturing, automotive, mining, energy, etc.) |
| `/dashboard` | Worker dashboard: trust score SVG radial, weekly rank progress, mini activity chart |
| `/upload` | Evidence upload with drag-drop zone and loading state |
| `/approve` | Supervisor approval center with approval history timeline |
| `/audit` | Audit timeline with visual connected timeline and certificate issuance |

### Testnet Contract Deployments

The following contracts are deployed on Stellar Testnet:

| Contract | Deploy TX | Contract Address |
|----------|-----------|------------------|
| MultiPartyApproval | [f637…ac53](https://stellar.expert/explorer/testnet/tx/f6378948f57e4d6555308c39e1e3cdc5e61522eb18119a84194299b8dda0ac53) | [`CBPH…JOYH`](https://lab.stellar.org/r/testnet/contract/CBPHZFRYKSE6PUWHU2HSNQTWBQ47GYV3U73KXPSOPIX3QLQJ7MLSJOYH) |
| EquipmentRegistry | [037c…7863](https://stellar.expert/explorer/testnet/tx/037c5b9f2204df92e975111e9d7d96027b90b9ae26c89aaeccf595414fab7863) | [`CAT5…WEW`](https://lab.stellar.org/r/testnet/contract/CAT57KYD2WU5QMNBSGB4FJQ37JUUQRKFDMZVPTJZVFC2H44EKWKZWWEW) |
| MaintenanceRecords | [bb8e…aae](https://stellar.expert/explorer/testnet/tx/bb8e10e0d5ce6d85e5019d5da8650e6cd1ec85c05f937041183c7097c1b06aae) | [`CBRI…775Z`](https://lab.stellar.org/r/testnet/contract/CBRIGG27YRAXG5H74ZOWSSJGMSTPQHZXJCDXA23QSSBIH6VYZZR4775Z) |
| ComplianceAttestation | [295c…1ef](https://stellar.expert/explorer/testnet/tx/295cf00852671856ea524a69bafd2bc1c159a73d18ffc411749fc6312f11b1ef) | [`CBR4…VIN`](https://lab.stellar.org/r/testnet/contract/CBR4HHPWRDXMJJOG65B6I5TRIBBUFAXAMUCTAJANAPBAIJHPKRUTCVIN) |

### Deploying Contracts Yourself

```bash
# Prerequisites: WASM files built, DEPLOYER_SECRET_KEY set
export DEPLOYER_SECRET_KEY="S<your_testnet_secret_key>"
node scripts/deploy-contracts.mjs
```

The script uploads each WASM blob to Soroban RPC and deploys the contract, printing contract IDs and `.env.local` entries.

## Validation

### Contract Tests

```bash
cd contracts
cargo test

# Run specific contract tests
cargo test -p equipment-registry
cargo test -p maintenance-records
cargo test -p multi-party-approval
cargo test -p compliance-attestation
```

Snapshot tests for `equipment-registry` are stored in `contracts/equipment-registry/test_snapshots/tests/`.

### Backend

```bash
cd backend
cargo build
# Start backend + Postgres, then:
curl http://localhost:8081/health
curl http://localhost:8081/health/config  # Shows database URL prefix (masked)
```

### Frontend

```bash
cd frontend
npm run build        # Production build with type checking + linting
npm run lint         # ESLint
npm run dev          # Dev server with HMR
```

The build generates 18 static pages. To verify all routes render correctly, start the dev server and navigate to each route listed in the Usage section.

### End-to-End Demo Scenario

A complete demo scenario (including a rejected supervisor submission followed by successful resubmission) is documented in `docs/demo-scenario.md`. The scenario exercises:

1. Equipment registration
2. Maintenance order creation
3. Evidence upload with hash computation
4. Supervisor approval (with a rejection path)
5. Audit trail retrieval
6. Compliance certificate issuance

## Results

### Visual Design System

The frontend implements an **Editorial + Glass** aesthetic:

- **Editorial masthead**: Numbered sections (01–08) with monospace identifiers, "Edition 47" strip, Soroban ledger indicators
- **Glass components**: Frosted surfaces (`backdrop-filter: blur(20px)`), hairline borders, subtle box shadows with blue/green glow variants
- **CSS variable system**: All colors, borders, and shadows referenced through custom properties in `globals.css` for consistent theming
- **Responsive**: Slide-out mobile navigation, adaptive grid layouts, touch-friendly interaction targets
- **Animations**: Sub-300ms transitions on hover, `fadeSlideUp` on notifications, `slideIn` on mobile nav

All landing page components pass visual inspection with zero console errors (verified via browser agent at 768px and 1280px viewports).

### Contract Coverage

- **EquipmentRegistry**: 3 unit tests covering registration, version retrieval, and owner transfer (verified via snapshot tests)
- **MaintenanceRecords**: CRUD operations for the maintenance order state machine
- **MultiPartyApproval**: Approval bitmap with configurable auditor requirement
- **ComplianceAttestation**: Certificate issuance scaffolded with cross-contract invocation stubbed

### Deployment

### Deployed Infrastructure

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | Set up via [vercel.com](https://vercel.com) — import this GitHub repo |
| Backend (Rust API) | Render | `https://maintchain.onrender.com` |
| Database | Supabase (pooled) | Supabase Postgres via pooler.supabase.com |
| Smart Contracts | Stellar Testnet | 4 Soroban contracts (see table below) |

### Frontend (Vercel) Deployment

The frontend is a Next.js 14 app (App Router) ready for Vercel deployment:

1. **Push the repo** to GitHub.
2. In [Vercel Dashboard](https://vercel.com), click **Add New → Project** and import the GitHub repo.
3. Vercel auto-detects Next.js. Keep the default build settings:
   - Framework: Next.js
   - Build Command: `next build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. **Set environment variables** in Vercel Dashboard → Project Settings → Environment Variables:

   ```env
   NEXT_PUBLIC_API_URL=https://maintchain.onrender.com
   NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
   NEXT_PUBLIC_EQUIPMENT_REGISTRY_ID=CAT57KYD2WU5QMNBSGB4FJQ37JUUQRKFDMZVPTJZVFC2H44EKWKZWWEW
   NEXT_PUBLIC_MAINTENANCE_RECORDS_ID=CBRIGG27YRAXG5H74ZOWSSJGMSTPQHZXJCDXA23QSSBIH6VYZZR4775Z
   NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID=CBPHZFRYKSE6PUWHU2HSNQTWBQ47GYV3U73KXPSOPIX3QLQJ7MLSJOYH
   NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID=CBR4HHPWRDXMJJOG65B6I5TRIBBUFAXAMUCTAJANAPBAIJHPKRUTCVIN
   ```

5. **Deploy!** Vercel builds and deploys automatically. Each push to `main` triggers a redeployment.

> **Note:** The `next.config.js` includes webpack aliases for `sodium-native` and `require-addon` — these are Node.js native addons that can't run in the browser. The Stellar SDK wraps them in try/catch and falls back to tweetnacl. The aliases prevent bundling errors on Vercel.

### Soroban Contracts

Four Soroban contracts deployed on Stellar Testnet (see table in Usage section). The `deploy-contracts.mjs` script automates WASM upload + contract deployment via Soroban RPC.

### Backend (Render)

The backend is containerized via Docker and deployed on Render using the `render.yaml` Blueprint. See `render.yaml` for service configuration.

## Limitations

1. **Cross-contract invocation is stubbed.** The `ComplianceAttestation.issue_certificate` function does not call `MaintenanceRecords.update_status`. Wiring requires matching function symbol names across crates (Soroban SDK restriction on symbol length ≤ 9 characters in `env.current().call()`).

2. **Soroban RPC dependency.** The frontend's `invokeContract` helper polls `getTransaction` up to 15 times (15 seconds). If the Soroban RPC endpoint is slow or unavailable, contract calls will fail. No fallback queuing is implemented.

3. **Off-chain evidence storage.** The backend stores evidence hashes but not the evidence files themselves. A production deployment would need IPFS, S3, or equivalent for media storage — this is not wired.

4. **API authentication is demo-grade.** The `Authorization: Bearer` header check (`API_KEY_ENV`) exists but is not wired into the router. The backend trusts all origins in development via `CorsLayer::permissive()`.

5. **Database URL handling.** The backend attempts to append `?sslmode=require` to all non-HTTPS connection strings. This works for Supabase and standard Postgres but may conflict with connection poolers that expect `sslmode=disable`.

6. **Placeholder pages.** Routes `/docs`, `/privacy`, `/terms`, `/contact` render a generic "Coming soon" placeholder. These are not production-ready.

7. **No CI/CD pipeline.** The proposed pipeline in `docs/ci-cd.md` is not wired into hosted CI. Contract deployment and backend release are manual.

8. **Soroban SDK version.** Contracts target Soroban SDK v21. SDK v22+ changed the cross-contract invocation API. Upgrading requires migrating `env.current().call()` invocations.

9. **Demo data is hardcoded.** Worker profiles, machine metadata, certificates, and leaderboard entries are defined in `frontend/src/data/maintchain.ts`. A production system would hydrate these from the API.

## Contributing

### Code Conventions

- **Rust contracts**: `no_std`, Soroban SDK v21 patterns. Tests use `soroban_sdk::testutils`.
- **Rust backend**: Axum handlers in separate modules (`audit.rs`, `complaint.rs`). SQL queries inline (no ORM). Migrations in `backend/migrations/`.
- **TypeScript frontend**: Next.js 14 App Router. Design system via CSS variables in `globals.css`. UI components in `frontend/src/components/maintchain/`. Data layer in `frontend/src/data/`.
- **API**: RESTful plural nouns (`/equipment`, `/maintenance`), POST for mutation, GET for reads. Structured error responses (`ApiErrorResponse`).

### Development Workflow

1. Make changes in the relevant crate or package.
2. Run contract tests: `cd contracts && cargo test`
3. Run backend: `cd backend && cargo run`
4. Run frontend: `cd frontend && npm run dev`
5. Verify build: `cd frontend && npm run build`

### Design System Changes

Color, spacing, and glass effects are controlled through CSS custom properties in `frontend/src/app/globals.css`. The canonical variables are:

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
  --glass-shadow: 0 1px 0 rgba(255, 255, 255, 0.95) inset, 0 8px 32px rgba(15, 23, 42, 0.07);
}
```

## License

This project is provided for demonstration and evaluation purposes. No license is specified — see the repository owner for usage terms.
