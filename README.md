# MaintChain

> A multi-party compliance platform for industrial maintenance records, powered by Stellar Soroban smart contracts. Every repair becomes a permanent, verifiable record that survives audits because it was never possible to falsify.

**Related documents:**
- [📘 Project Guide & Use Cases](./PROJECT_GUIDE.md) — Whitepaper-style narrative covering problem, solution, stakeholder analysis, and industry scenarios
- [🏗️ System Architecture & Design](./SYSTEM_DESIGN.md) — Full system design with data flow diagrams, security model, and trade-off analysis
- [📐 Architecture Diagram (Interactive)](./SYSTEM_DESIGN_DIAGRAM.html) — Visual HTML system architecture diagram (open in browser)
- [🔗 Stellar SDK & Contract Integration](./STELLAR_INTEGRATION.md) — Deep-dive on Soroban contracts, Stellar SDK usage, and deployment pipeline

---

## Abstract

MaintChain prevents falsification of industrial maintenance records by enforcing a **multi-party approval workflow on-chain**. A maintenance record is only considered compliant after independent roles (technician, supervisor, optionally auditor) have recorded their approvals via Soroban smart contracts on Stellar Testnet. Evidence files remain off-chain; only cryptographic hashes are stored on-chain. The project ships a full stack: five Soroban contracts (Rust, `no_std`), an Axum REST backend (Rust, Postgres), a Next.js frontend with Freighter wallet integration, and automated contract deployment scripts.

---

## Problem

Industrial maintenance records today are:
- **Mutable** — paper logs and spreadsheets can be altered after the fact.
- **Single-party** — one person's approval is rarely audited by independent roles.
- **Isolated** — a technician's reputation does not travel with them across employers or regions.
- **Expensive to audit** — verifying a repair history requires chasing down siloed records.

The gap is not technical capability but *incentive compatibility*: no existing system chains approvals together in a way that makes falsification provably expensive and honest work provably cheap to verify.

For a detailed breakdown of the problem, industry impact, and use-case scenarios, see [PROJECT_GUIDE.md](./PROJECT_GUIDE.md#2-the-problem-industrial-maintenance-record-tampering).

---

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

> **Interactive architecture diagram:** Open [`SYSTEM_DESIGN_DIAGRAM.html`](./SYSTEM_DESIGN_DIAGRAM.html) in a browser for a visual, layer-by-layer breakdown of the entire system — including deployment infrastructure, compliance flow, and module details.

---

![Live Webpage](Live_webpage.png)


![Mobile Responsive](Mobile-responsive-proof.png)


### Smart Contracts (5 crates)

Each contract is an independent Soroban crate compiled to WASM (`wasm32v1-none`):

1. **EquipmentRegistry** — Registers equipment with an owner, metadata hash, and **versioned snapshot history**. Ownership transfers create new versioned snapshots with distinct hashes. Each snapshot is self-certifying: the equipment hash is `SHA256(SEP || equipment_id || metadata_hash || created_at || version)`.

2. **MaintenanceRecords** — Stores maintenance orders with status enum (`Open → Submitted → PendingApproval → Compliant → Rejected`). Evidence hashes are attached at submission time. The contract exposes an `update_status` function intended to be callable by the approval engine.

3. **MultiPartyApproval** — Tracks approval state per maintenance ID across three roles: technician, supervisor, and optionally auditor. `verify_compliance` returns true only when all required approvals are satisfied. This is the **enforcement point**: no off-chain logic can mark a record compliant without the on-chain approval bitmap.

4. **ComplianceAttestation** — Issues a final certificate (attestation) containing the issuer address, cert hash, and timestamp. The `issue_certificate` function performs cross-contract calls to verify compliance before minting.

5. **IdentityRegistry** — Records identity verification events per Stellar wallet. Stores role code, organization hash, profile hash, ledger timestamp, and version for forward compatibility. Supports re-verification (version bump). Used by the `/get-verified` flow to produce a dedicated Freighter-signed Soroban transaction as proof of identity.

> For a detailed technical deep-dive on each contract — including data structures, function signatures, test coverage, and deployment addresses — see [STELLAR_INTEGRATION.md](./STELLAR_INTEGRATION.md#4-contract-deep-dives).

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
| Worker profiles, reviews, machine metadata | Off-chain (frontend data layer / Postgres) | High churn; not safety-critical; cached from API |
| Audit trail (timestamped approval log) | Off-chain (Postgres) | Backend stores append-only approval log; on-chain mirror planned |

---

## Repository Layout

```
.
├── PROJECT_GUIDE.md                  # 📘 Whitepaper — use cases, stakeholders, market impact
├── SYSTEM_DESIGN.md                  # 🏗️ Architecture — full system design with data flows
├── SYSTEM_DESIGN_DIAGRAM.html        # 📐 Interactive architecture diagram (open in browser)
├── STELLAR_INTEGRATION.md            # 🔗 Stellar SDK & contract deep-dive
│
├── backend/                          # Rust (Axum) REST API
│   ├── Cargo.toml                    # Dependencies: axum, sqlx, soroban-sdk, sha2
│   ├── src/
│   │   ├── main.rs                   # Router, handlers, CORS, DB pool
│   │   ├── audit.rs                  # GET /maintenance/:id/audit, POST auditor approval
│   │   ├── complaint.rs              # Compliance transition logic
│   │   ├── soroban_client.rs         # Soroban RPC wrapper (demo mode)
│   │   ├── storage.rs                # File hashing + IPFS upload
│   │   ├── seed.rs                   # Database seeder
│   │   └── seed_main.rs              # Binary entry point for seeding
│   └── migrations/
│       ├── 0001_init.sql             # Tables: equipment, maintenance_records, approvals
│       └── 0002_blockchain_integration.sql  # Contract address + tx_id columns
│
├── contracts/                        # Soroban smart contracts (Rust, no_std)
│   ├── Cargo.toml                    # Workspace with 5 members
│   ├── equipment-registry/           # Equipment registration + versioned snapshots
│   ├── maintenance-records/          # Maintenance order state machine
│   ├── multi-party-approval/         # Approval state bitmap (tech/supervisor/auditor)
│   ├── compliance-attestation/       # Certificate issuance + eligibility check
│   └── identity-registry/            # Identity verification + wallet attestation
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
│   │   │   ├── technician/           # Technician task list
│   │   │   ├── workers/              # Worker discovery + profiles
│   │   │   ├── machines/             # Machine passport directory
│   │   ├── get-verified/         # Identity verification flow (7-stage state machine)
│   │   ├── certificates/         # Certificate registry
│   │   ├── live-network/         # Real-time activity feed
│   │   ├── leaderboard/          # Global trust rankings
│   │   ├── industries/           # Industry coverage
│   │   ├── docs/                 # Coming soon (Q3 2026)
│   │   ├── privacy/              # Coming soon (Q3 2026)
│   │   ├── terms/                # Coming soon (Q3 2026)
│   │   └── contact/              # Coming soon (Q3 2026)
│   │   ├── components/
│   │   │   ├── maintchain/           # UI component library
│   │   │   │   ├── ui.tsx            # EditorialSectionHeader, StatusBadge, ProfileCard, etc.
│   │   │   │   ├── Nav.tsx           # Navigation with mobile slide-out
│   │   │   │   ├── FadeInView.tsx    # Scroll-triggered animation wrapper
│   │   │   │   ├── TrustReplay.tsx   # 6-stage trust replay visualizer
│   │   │   │   ├── RouteShell.tsx    # Layout shell with masthead strip
│   │   │   │   ├── FeedbackButton.tsx # User feedback collection widget
│   │   │   │   ├── SentryErrorBoundary.tsx # Error boundary with Sentry reporting
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

---

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
| IdentityRegistry | `target/wasm32v1-none/release/identity_registry.wasm` |

> **Important:** Use **release** WASM for deployment. Debug WASM artifacts can exceed the Soroban RPC payload limit (HTTP 413).

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
export IDENTITY_REGISTRY_CONTRACT_ID="<deployed_contract_id>"
cargo run
```

> **Note:** The `IDENTITY_REGISTRY_CONTRACT_ID` env var is required for the `/verification/readiness` endpoint to report `identity_registry_configured: true`. The backend will warn on startup if this is not set.

The backend listens on `http://127.0.0.1:8081`.

Health check:

```bash
curl http://localhost:8081/health
# → {"status":"ok"}
```

To seed demo data:

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

Optional — after deploying contracts, add the generated contract IDs:

```env
NEXT_PUBLIC_EQUIPMENT_REGISTRY_ID=<contract_id>
NEXT_PUBLIC_MAINTENANCE_RECORDS_ID=<contract_id>
NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID=<contract_id>
NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID=<contract_id>
NEXT_PUBLIC_IDENTITY_REGISTRY_ID=<contract_id>
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

---

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
| `/get-verified` | Identity verification: 7-stage flow with Freighter signature, on-chain proof, and backend mirror |
| `/leaderboard` | Global trust rankings: top workers, trust growth, evidence quality, zero-complaint |
| `/industries` | Industry coverage (manufacturing, automotive, mining, energy, etc.) |
| `/dashboard` | Worker dashboard: trust score SVG radial, weekly rank progress, mini activity chart |
| `/upload` | Evidence upload with drag-drop zone and loading state |
| `/approve` | Supervisor approval center with approval history timeline |
| `/audit` | Audit timeline with visual connected timeline and certificate issuance |
| `/technician` | Technician task list with action buttons |



### Testnet Contract Deployments

The following contracts are deployed on Stellar Testnet:

| Contract | Deploy TX | Contract Address |
|----------|-----------|------------------|
| IdentityRegistry | *(deployed via stellar CLI)* | `CCCKDY2NIQOHKEFB6BIGYZYEW6YAMRBMLYP3HEDYCYHAMZQUDY26BXNW` |
| MultiPartyApproval | *(re-deployed)* | `CDGJ6VX3TG4M66SBFS5LCBPTF26GEFRZXXAYNYAWYRYHG2WDJ7UYAZSC` |
| EquipmentRegistry | *(re-deployed)* | `CBTOLJE5FVYO4Y473OIZIBX3OAAZAKCRODZ4LI56Q5UYMQTXRUSVC2EO` |
| MaintenanceRecords | *(re-deployed)* | `CDZ324UZJCIKG32YKY4MFZX5AO63VXCK73NO5QS3QI3256UDBYR5LP6M` |
| ComplianceAttestation | *(re-deployed)* | `CDDMPFXM3DMXZBMKBQR4UBSOXB5XZIDLVAJGX3L7D4C6TTFXGKY7EGU2` |

### Deploying Contracts Yourself

```bash
# Prerequisites: WASM files built, DEPLOYER_SECRET_KEY set
export DEPLOYER_SECRET_KEY="S<your_testnet_secret_key>"
node scripts/deploy-contracts.mjs
```

The script uploads each WASM blob to Soroban RPC and deploys the contract, printing contract IDs and `.env.local` entries.

> For the complete contract deployment pipeline — including environment variables, RPC endpoints, and troubleshooting — see [STELLAR_INTEGRATION.md](./STELLAR_INTEGRATION.md#7-contract-deployment-pipeline).

---



# [SYSTEM DESIGN EXPLAINED](https://maintchainsysdesign.vercel.app/)

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
cargo test -p identity-registry
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

A complete demo scenario (including a rejected supervisor submission followed by successful resubmission) exercises:

1. Equipment registration
2. Maintenance order creation
3. Evidence upload with hash computation
4. Supervisor approval (with a rejection path)
5. Audit trail retrieval
6. Compliance certificate issuance

### Get Verified Demo Checklist

A complete end-to-end demo of the identity verification flow:

1. Open `/get-verified`
2. Click **Start Verification**
3. Connect Freighter wallet on Stellar Testnet
4. Confirm balance is visible
5. Approve the wallet signature challenge
6. Backend readiness check passes (database + contract configured)
7. Create user profile (name, role, organization) or skip if already registered
8. Review verification payload
9. Sign `IdentityRegistry.verify_identity` transaction in Freighter
10. Wait for transaction confirmation
11. Backend mirror syncs record to Postgres
12. Success page shows transaction hash, explorer link, and contract ID



---

## Results

### Visual Design System

The frontend implements an **Editorial + Glass** aesthetic:

- **Editorial masthead**: Numbered sections (01–08) with monospace identifiers, "Edition 47" strip, Soroban ledger indicators
- **Glass components**: Frosted surfaces (`backdrop-filter: blur(20px)`), hairline borders, subtle box shadows with blue/green glow variants
- **CSS variable system**: All colors, borders, and shadows referenced through custom properties in `globals.css` for consistent theming
- **Responsive**: Slide-out mobile navigation, adaptive grid layouts, touch-friendly interaction targets
- **Animations**: Sub-300ms transitions on hover, `fadeSlideUp` on notifications, `slideIn` on mobile nav

All landing page components pass visual inspection with zero console errors (verified via browser at 768px and 1280px viewports).


### Contract Coverage

- **EquipmentRegistry**: 3 unit tests covering registration, version retrieval, and owner transfer (verified via snapshot tests)
- **MaintenanceRecords**: CRUD operations for the maintenance order state machine
- **MultiPartyApproval**: Approval bitmap with configurable auditor requirement
- **ComplianceAttestation**: Certificate issuance with cross-contract invocation scaffolded
- **IdentityRegistry**: 6 unit tests covering verification storage, pre-verification state, re-verification version bumps, field preservation, wallet isolation, and is_verified state transitions

### Monitoring & Analytics

MaintChain integrates **Sentry** for error tracking and performance monitoring across both frontend and backend:

- **Frontend**: `@sentry/nextjs` — captures JavaScript errors, unhandled promise rejections, and performance data. Session replay samples 10% of sessions (100% on error).
- **Backend**: `sentry + sentry-tower` — captures server-side errors and request performance. Configurable via `SENTRY_DSN` environment variable.
- **User Feedback**: A floating feedback widget (`FeedbackButton`) submits user feedback to Sentry's User Feedback API, capturing error context automatically.



### Deployment

### Deployed Infrastructure

| Service | Platform | URL / Location |
|---------|----------|----------------|
| Frontend | Vercel | Import this GitHub repo via [vercel.com](https://vercel.com) |
| Backend (Rust API) | Render | `https://maintchain.onrender.com` |
| Database | Supabase | Supabase Postgres via pooler.supabase.com |
| Smart Contracts | Stellar Testnet | 5 Soroban contracts (see [deployment table](#testnet-contract-deployments)) |

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
   NEXT_PUBLIC_IDENTITY_REGISTRY_ID=<deployed_contract_id>
   ```

5. **Deploy!** Vercel builds and deploys automatically. Each push to `main` triggers a redeployment.

> **Note:** The `next.config.js` includes webpack aliases for `sodium-native` and `require-addon` — these are Node.js native addons that can't run in the browser. The Stellar SDK wraps them in try/catch and falls back to tweetnacl. The aliases prevent bundling errors on Vercel.

### Backend (Render)

The backend is containerized via Docker and deployed on Render using the `render.yaml` Blueprint. See `render.yaml` for service configuration.

---

## Limitations

1. **Cross-contract invocation is stubbed.** The `ComplianceAttestation.issue_certificate` function performs cross-contract calls but the Soroban SDK v21 symbol-length constraint requires careful matching. Full wiring is in progress.

2. **Soroban RPC dependency.** The frontend's `invokeContract` helper polls `getTransaction` up to 15 times (15 seconds). If the Soroban RPC endpoint is slow or unavailable, contract calls will fail. No fallback queuing is implemented.

3. **Off-chain evidence storage.** The backend stores evidence hashes but not the evidence files themselves. A production deployment would need IPFS, S3, or equivalent for media storage.

4. **API authentication is demo-grade.** The `Authorization: Bearer` header check (`API_KEY_ENV`) exists but is not wired into the router. The backend trusts all origins in development via `CorsLayer::permissive()`.

5. **Database URL handling.** The backend attempts to append `?sslmode=require` to all non-HTTPS connection strings. This works for Supabase and standard Postgres but may conflict with connection poolers.

6. **Placeholder pages.** Routes `/docs`, `/privacy`, `/terms`, `/contact` render generic placeholders.

7. **No CI/CD pipeline.** Contract deployment and backend release are manual. CI/CD configuration is proposed but not wired.

8. **Soroban SDK version.** Contracts target SDK v21. SDK v22+ changed the cross-contract invocation API.

9. **Demo data is hardcoded.** Worker profiles, machine metadata, certificates, and leaderboard entries are defined in `frontend/src/data/maintchain.ts`. A production system would hydrate these from the API.

> For a complete list of known issues, planned improvements, and the development roadmap, see [PROJECT_GUIDE.md](./PROJECT_GUIDE.md#8-current-status--roadmap) and [STELLAR_INTEGRATION.md](./STELLAR_INTEGRATION.md#9-known-limitations--roadmap).

---

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

---

## License

This project is provided for demonstration and evaluation purposes. No license is specified — see the repository owner for usage terms.


[def]: Live-webpage.png