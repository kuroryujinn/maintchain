# MaintChain — System Architecture & Design

**Full System Design Document — July 2026**

---

## 1. System Overview

MaintChain is a **three-tier decentralized application (dApp)** comprising:

1. **Smart Contracts** on Stellar Soroban (blockchain layer)
2. **REST Backend** in Rust/Axum with PostgreSQL (off-chain service layer)
3. **Web Frontend** in Next.js 14 with Freighter wallet integration (presentation layer)

The architecture follows a **dual-path pattern**: the frontend communicates with Stellar Testnet directly via Freighter for on-chain operations, and with the REST backend for off-chain CRUD workflows. These two paths are independent yet complementary — the on-chain contracts provide **immutable approval state**, while the off-chain backend provides **flexible data management and supplementary services**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js 14)                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Presentation Layer                         │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌───────┐  │  │
│  │  │ Landing │ │Dashboard │ │Upload  │ │ Approve  │ │Audit  │  │  │
│  │  │ Page    │ │          │ │Evidence │ │ Workflow │ │Trail  │  │  │
│  │  └─────────┘ └──────────┘ └────────┘ └──────────┘ └───────┘  │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌───────┐  │  │
│  │  │Workers  │ │ Machines │ │Certs   │ │Leader-   │ │Live   │  │  │
│  │  │         │ │          │ │        │ │board     │ │Network│  │  │
│  │  └─────────┘ └──────────┘ └────────┘ └──────────┘ └───────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Integration Layer                          │  │
│  │                                                               │  │
│  │  ┌──────────────────────────┐     ┌────────────────────────┐  │  │
│  │  │  useSoroban() Hook       │     │  api.ts REST Client    │  │  │
│  │  │  ┌──────────────────┐    │     │  ┌──────────────────┐  │  │  │
│  │  │  │ Wallet Connect   │    │     │  │ fetch wrapper    │  │  │  │
│  │  │  │ Balance Check    │    │     │  │ typed endpoints  │  │  │  │
│  │  │  │ Contract Calls   │    │     │  │ error handling   │  │  │  │
│  │  │  │ XLM Transfers    │    │     │  │ (ApiError)       │  │  │  │
│  │  │  └──────┬───────────┘    │     │  └────────┬─────────┘  │  │  │
│  │  └─────────┼────────────────┘     └───────────┼─────────────┘  │  │
│  │            │                                   │               │  │
│  │            ▼                                   ▼               │  │
│  │  ┌──────────────────────┐     ┌────────────────────────────┐   │  │
│  │  │ Freighter Extension  │     │   HTTP (fetch)            │   │  │
│  │  │ (Stellar Key Mgmt)   │     │   http://localhost:3000   │   │  │
│  │  └──────────┬───────────┘     └───────────┬────────────────┘   │  │
│  └─────────────┼─────────────────────────────┼────────────────────┘  │
└────────────────┼─────────────────────────────┼───────────────────────┘
                 │                             │
    ┌────────────┼─────────────────────────────┼────────────┐
    │            │ Soroban RPC                 │ HTTP       │
    │            ▼                             ▼            │
    │  ┌──────────────────────┐  ┌────────────────────────┐ │
    │  │  Stellar Testnet     │  │  Backend (Axum :8081)  │ │
    │  │                      │  │                        │ │
    │  │  ┌────────────────┐  │  │  ┌──────────────────┐  │ │
    │  │  │ Equipment      │  │  │  │ Equipment CRUD   │  │ │
    │  │  │ Registry       │  │  │  └──────────────────┘  │ │
    │  │  └────────────────┘  │  │  ┌──────────────────┐  │ │
    │  │  ┌────────────────┐  │  │  │ Maintenance Ops  │  │ │
    │  │  │ Maintenance    │  │  │  └──────────────────┘  │ │
    │  │  │ Records        │  │  │  ┌──────────────────┐  │ │
    │  │  └────────────────┘  │  │  │ Supervisor       │  │ │
    │  │  ┌────────────────┐  │  │  │ Approvals        │  │ │
    │  │  │ Multi-Party    │  │  │  └──────────────────┘  │ │
    │  │  │ Approval       │  │  │  ┌──────────────────┐  │ │
    │  │  └────────────────┘  │  │  │ Audit Trail      │  │ │
    │  │  ┌────────────────┐  │  │  └──────────────────┘  │ │
    │  │  │ Compliance     │  │  │  ┌──────────────────┐  │ │
    │  │  │ Attestation    │  │  │  │ Evidence Hashing │  │ │
    │  │  └────────────────┘  │  │  └──────────────────┘  │ │
    │  └──────────────────────┘  │  ┌──────────────────┐  │ │
    │                             │  │ SorobanClient   │  │ │
    │                             │  └──────────────────┘  │ │
    │                             └───────────┬────────────┘ │
    │                                         │              │
    │                                         ▼              │
    │                              ┌──────────────────────┐  │
    │                              │  PostgreSQL 16       │  │
    │                              │  (Supabase)          │  │
    │                              │  ┌────────────────┐  │  │
    │                              │  │ equipment      │  │  │
    │                              │  │ maintenance_   │  │  │
    │                              │  │ records        │  │  │
    │                              │  │ approvals      │  │  │
    │                              │  └────────────────┘  │  │
    │                              └──────────────────────┘  │
    └────────────────────────────────────────────────────────┘
```

---

## 2. Why This Architecture?

### 2.1 Design Principles

| Principle | Application |
|-----------|-------------|
| **Separation of Concerns** | Smart contracts handle immutable state; backend handles CRUD; frontend handles presentation |
| **Defense in Depth** | Multi-party approval on-chain prevents single-party falsification |
| **Progressive Trust** | Users start with zero trust and build reputation through verifiable work |
| **Data Minimization** | Only hashes and approval states go on-chain; evidence files remain off-chain |
| **Platform Independence** | No lock-in to any blockchain, database, or hosting provider |

### 2.2 Dual-Path Architecture: Why Both On-Chain and Off-Chain?

**The key architectural decision** is maintaining parallel on-chain and off-chain systems:

| Concern | Why On-Chain | Why Off-Chain |
|---------|-------------|---------------|
| Approval state | Immutable — no single party can rewrite | Quick reads for UI, no RPC latency |
| Evidence | Cryptographic proof-of-existence | Files too large for blockchain |
| User profiles | Not needed (static metadata) | Flexible, high churn, searchable |
| Audit trail | Permanent, public verification | Supplementary detail, rich queries |
| Equipment metadata | Ownership chain of custody | Searchable fields, frequent updates |

This hybrid approach gives us the **security guarantees of blockchain** where they matter most (approvals, certificates, evidence hashes) with the **performance and flexibility of traditional databases** everywhere else.

---

## 3. Component Deep-Dive

### 3.1 Smart Contracts (Blockchain Layer)

**All contracts are written in Rust** targeting `wasm32v1-none` (Soroban's `no_std` environment). They are compiled to WASM and deployed via Soroban RPC.

#### 3.1.1 EquipmentRegistry

**Purpose:** Register industrial equipment with an owner and track ownership changes via versioned snapshots.

**Key Functions:**
- `register_equipment` — Creates a new equipment record with version 1
- `update_owner` — Transfers ownership, creating a new versioned snapshot
- `get_equipment` — Returns the latest version of an equipment record
- `get_equipment_version` — Returns a specific historical version

**State Model:**
Each equipment has:
- `EquipmentSnapshot`: `{ equipment_id, version, owner, metadata_hash, equipment_hash, created_at }`
- The `equipment_hash` is computed as `SHA256("EQUP" || equipment_id || metadata_hash || created_at || version)` — this is a **self-certifying hash** that includes all immutable data
- Ownership transfers create new versions with distinct hashes, creating an unbroken chain of custody

**Why This Contract:**
Without equipment registration, maintenance records would float unattached to any asset. The versioned snapshot approach allows proving equipment lineage without relying on any centralized registry.

#### 3.1.2 MaintenanceRecords

**Purpose:** Maintain the state machine for individual maintenance jobs.

**State Machine:**
```
Open → Submitted → PendingApproval → Compliant
                    ↓
                 Rejected
```

**Key Functions:**
- `create_record` — Opens a new maintenance order
- `submit_evidence` — Attaches evidence hash and transitions to Submitted
- `update_status` — General status transition (intended for cross-contract calls)
- `set_authorized_completer` — Restricts which address may complete a record
- `complete` — Final transition to Compliant (called by ComplianceAttestation)
- `get_record` — Returns current state

**Why This Contract:**
The state machine ensures that maintenance records follow a deterministic, verifiable workflow. No off-chain logic can mark a record Compliant without going through the on-chain state transitions.

#### 3.1.3 MultiPartyApproval

**Purpose:** The enforcement point — tracks approval state across roles.

**Approval Bitmap:**
```rust
struct ApprovalState {
    tech_approved: bool,
    supervisor_approved: bool,
    auditor_approved: bool,
    auditor_required: bool,
}
```

**Key Functions:**
- `approve_by_technician` / `approve_by_supervisor` / `approve_by_auditor` — Role-specific approvals
- `reject_by_supervisor` — Rejection (resets supervisor approval)
- `verify` — Returns `true` only if ALL required roles have approved
- `set_auditor_required` — Configure whether an auditor signature is needed

**Why This Contract:**
This contract is the **heart of the system**. It enforces the multi-party rule that makes MaintChain trustworthy. The `verify` function is the single source of truth for whether a maintenance record meets compliance requirements.

#### 3.1.4 ComplianceAttestation

**Purpose:** Issue final compliance certificates.

**Key Functions:**
- `issue_certificate` — Verifies compliance via cross-contract call to `MultiPartyApproval.verify`, issues attestation with cert hash, and completes the record via `MaintenanceRecords.complete`
- `get_attestation` — Returns stored attestation

**Why This Contract:**
The attestation is the **terminal artifact** of the compliance workflow. It is a permanently verifiable certificate that any party can check without contacting any off-chain system. The cross-contract invocation architecture ensures that certificates are only issued when the approval chain is complete.

#### 3.1.5 IdentityRegistry

**Purpose:** Verify a wallet's identity (role, organization, profile hash) on-chain, producing a portable, versioned identity record that travels with the Stellar address.

**Key Functions:**
- `verify_identity` — Writes (or re-verifies) an identity record: role code, organization hash, profile hash, version
- `is_verified` — Returns `true` if the wallet has a stored identity record
- `get_verification` — Returns the full identity record

**Why This Contract:**
It is the **entry point for the Get Verified flow** (`/get-verified`). A user's verified role, organization, and SHA-256 identity hashes become an immutable, portable credential — so a technician's reputation carries across employers without re-verification.

### 3.2 Backend (Service Layer)

**Written in Rust** using the Axum web framework. Runs as a Docker container on Render.

#### 3.2.1 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/health/config` | Database URL status (masked) |
| POST | `/auth/challenge` | SEP-53 challenge: create nonce |
| POST | `/auth/verify` | SEP-53 challenge: verify signature |
| GET/POST | `/equipment` | List / register equipment |
| GET | `/maintenance` | List all maintenance records |
| GET | `/maintenance/pending` | List records awaiting approval |
| POST | `/maintenance/orders` | Create maintenance order |
| GET | `/maintenance/:id` | Get specific maintenance record |
| POST | `/maintenance/:id/evidence` | Submit evidence hash |
| POST | `/maintenance/:id/evidence/upload` | Upload evidence file (multipart) |
| GET | `/maintenance/:id/audit` | Get full audit trail |
| POST | `/maintenance/:id/approvals/supervisor` | Supervisor approve |
| POST | `/maintenance/:id/approvals/supervisor/reject` | Supervisor reject |
| POST | `/maintenance/:id/approvals/auditor` | Auditor approve (issue certificate) |
| GET | `/compliance/dashboard` | Compliance dashboard summary |
| GET | `/compliance/eligible/:id` | Check record eligibility for certification |
| GET | `/compliance/attestation/:id` | Get on-chain attestation |
| GET | `/onchain/record/:id` | Read on-chain maintenance record |
| POST | `/hash/evidence` | Compute SHA-256 hash of payload |
| GET/POST | `/users` | List / register users |
| GET | `/users/count` | Registered user count |
| GET | `/users/:stellar_address` | Lookup user by wallet address |
| GET | `/verification/readiness` | Get Verified readiness check |
| GET | `/verification/:stellar_address` | Lookup verification by wallet |
| POST | `/verification` | Mirror on-chain verification result |
| GET/POST | `/tx-log` | List / record transaction-log events |

> Auth routes (`/auth/*`) are public; all other routes require `MAINTCHAIN_API_KEY` (proxy-injected) and, except `/health*`, a valid wallet session cookie.

#### 3.2.2 Key Backend Components

**Axum Router** (`main.rs`):
- Configures all routes, CORS middleware, Sentry integration
- Manages database connection pool via sqlx
- Handles request/response serialization

**Audit Module** (`audit.rs`):
- `get_audit_trail` — Joins approvals and maintenance records to build a complete audit timeline
- `approve_by_auditor` — Transition to Compliant, issue certificate

**Auth Module** (`auth.rs`):
- SEP-53 challenge-response — generates 32-byte nonces (stored in `challenge_nonces`), verifies Ed25519 signatures via `stellar-strkey`
- Backend counterpart to the proxy's HMAC-signed session cookie; `identity_middleware` rejects requests whose body `stellar_address` doesn't match the authenticated session

**Soroban Client** (`soroban_client.rs`):
- **Verify-only** RPC wrapper — simulates read-only contract calls (e.g. `MultiPartyApproval.verify`) and reads back on-chain state to sync the database
- Uses the native Rust RPC transport (`soroban_rpc.rs`) — no Node.js subprocess, no signing, no deployer secret key
- All state-changing transactions are signed by users' Freighter wallets via the frontend

**Transaction Log** (`tx_log.rs`):
- Mirrors frontend on-chain transaction status events into the `transaction_log` table

**Storage Module** (`storage.rs`):
- `compute_file_hash` — SHA-256 hashing of uploaded evidence files
- `upload_to_ipfs` — Pinata IPFS upload (optional, requires Pinata credentials)

#### 3.2.3 Database Schema

**Tables:**
- `equipment` — Equipment records (id, owner_id, metadata_hash, serial_number, name, location)
- `maintenance_records` — Maintenance job state (id, equipment_id, technician_id, status, evidence_hash, created_at)
- `approvals` — Approval events (id, maintenance_id, approver_id, role, decision, timestamp, note)
- `users` — User registration for Stellar wallet linking (id, stellar_address, name, role, organization, created_at)
- `challenge_nonces` — SEP-53 challenge messages (nonce, expires_at)
- `user_verifications` — On-chain identity verification mirrors (wallet, role, organization, contract ID, version)
- `transaction_log` — Frontend-mirrored on-chain transaction status events

### 3.3 Frontend (Presentation Layer)

**Built with Next.js 14 App Router** and deployed on Vercel.

#### 3.3.1 Route Structure

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Landing Page | Hero, Trust Replay visualization, stats, network feed |
| `/dashboard` | Worker Dashboard | Trust score radial, weekly rank, activity chart |
| `/upload` | Evidence Upload | Drag-drop zone, evidence submission |
| `/approve` | Approval Center | Supervisor approval/rejection with history timeline |
| `/audit` | Audit Timeline | Visual connected timeline, certificate issuance |
| `/technician` | My Tasks | Technician task list with action buttons |
| `/workers` | Worker Discovery | Search, filter by industry, sort by trust score |
| `/workers/:slug` | Worker Profile | Reputation, skills, reviews, repair history |
| `/machines` | Machine Passports | Equipment directory |
| `/machines/:id` | Machine Detail | Timeline, certificates, maintenance history |
| `/certificates` | Certificate Registry | All issued certificates |
| `/certificates/:id` | Certificate Detail | Approval chain, blockchain record |
| `/leaderboard` | Trust Rankings | Top workers, trust growth, evidence quality |
| `/industries` | Industry Coverage | Industry-specific compliance info |
| `/live-network` | Activity Feed | Real-time network events |
| `/register` | User Registration | Wallet connect, SEP-53 challenge, role selection |
| `/users` | User Directory | Registered users with search/filter |
| `/feedback` | Feedback & Rating | 5-star ratings and category selection |
| `/technical-preview` | Technical Preview | Phase 1 "What to Test" guide |

#### 3.3.2 Key Frontend Components

**Wallet Integration (`useSoroban.ts`):**
- React hook managing all Freighter interactions
- Handles: connect, disconnect, network validation, balance checking, XLM transfers, contract calls
- Persists wallet address to localStorage across sessions
- Validates Stellar Testnet vs Mainnet to prevent transaction errors

**Soroban Service (`soroban.ts`):**
- Low-level Soroban RPC interaction using `@stellar/stellar-sdk` v13
- Implements: `simulateContract` (read-only) and `invokeContract` (write operations)
- Full transaction lifecycle: build → simulate for footprint → sign with Freighter → submit → poll for completion (up to 15 seconds)
- Helper functions: `toScVal`, `bytes32ScVal`, `toBytesN32` for argument serialization

**API Client (`api.ts`):**
- Typed fetch wrapper around backend REST API
- All endpoints typed with request/response interfaces
- `ApiError` class with structured error codes and messages
- Base URL configurable via `NEXT_PUBLIC_API_URL`

**UI Component Library (`components/maintchain/`):**
- 15+ reusable components (Nav, RouteShell, FadeInView, TrustReplay, FeedbackButton, etc.)
- Landing page sub-components (Hero, ActivityFeed, ComparisonCard, LeaderboardPreview, etc.)
- Glass design system (`.glass`, `.glass-glow-blue`, `.glass-glow-green`, `.glass-edge-*` classes)

#### 3.3.3 Design System

**Editorial + Glass Aesthetic:**
- Numbered sections (01–08) with monospace identifiers
- Frosted surfaces with `backdrop-filter: blur(20px)`
- Hairline borders, subtle box shadows, blue/green glow variants
- CSS variable system: all colors, borders, shadows referenced through custom properties
- Responsive: slide-out mobile navigation, adaptive grid layouts

---

## 4. Data Flow Diagrams

### 4.1 Evidence Submission Flow

```
User Uploads File → Frontend UI
    │
    ├──→ [Off-Chain] API Client → POST /maintenance/:id/evidence/upload
    │       │
    │       ├──→ Backend computes SHA-256 hash
    │       ├──→ (Optional) Upload to IPFS via Pinata
    │       └──→ Store hash in PostgreSQL
    │
    └──→ [On-Chain] Freighter → Soroban RPC
            │
            └──→ MaintenanceRecords.submit_evidence(maintenance_id, evidence_hash)
                    │
                    └──→ Status: Open → Submitted
```

### 4.2 Approval Flow

```
Supervisor Reviews Evidence → Frontend App/Approve Page
    │
    ├──→ [Off-Chain] POST /maintenance/:id/approvals/supervisor
    │       │
    │       ├──→ Insert approval event in Postgres
    │       └──→ Status: Submitted → PendingApproval
    │
    └──→ [On-Chain] Freighter → Soroban RPC
            │
            └──→ MultiPartyApproval.approve_by_supervisor(id, decision)
    
    (If auditor required:)
    Supervisor → Auditor → Frontend App/Audit Page
        │
        ├──→ [Off-Chain] POST /maintenance/:id/approvals/auditor
        └──→ [On-Chain] Freighter → Soroban RPC
                │
                └──→ MultiPartyApproval.approve_by_auditor(id)
```

### 4.3 Certificate Issuance Flow

```
All Approvals Complete → Auditor clicks "Issue Certificate"
    │
    ├──→ [On-Chain] Freighter → Soroban RPC
    │       │
    │       ├──→ ComplianceAttestation.issue_certificate(
    │       │       approval_contract, records_contract, maintenance_id, cert_hash)
    │       │       ├──→ [Cross-Contract] MultiPartyApproval.verify → check bitmap
    │       │       └──→ [Cross-Contract] MaintenanceRecords.complete → Compliant
    │       │
    │       └──→ Attestation stored on-chain permanently
    │
    └──→ [Off-Chain] Backend records completion
            │
            └──→ Status updated in PostgreSQL
```

---

## 5. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  maintchain.vercel.app                                │  │
│  │  Next.js 14 (SSG + Client Components)                 │  │
│  │  Sentry SDK (error tracking + performance)            │  │
│  └───────────────────────────────────────────────────────┘  │
│                    │                                         │
│                    │ HTTPS (fetch)                           │
│                    ▼                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Render (Docker)                                      │  │
│  │  maintchain-backend                                   │  │
│  │  Rust Axum API :8081                                  │  │
│  │  Sentry SDK (server-side)                             │  │
│  │  Health check: /health                                │  │
│  └──────────────┬────────────────────────────────────────┘  │
│                  │                                           │
│       ┌──────────┴──────────┐                                │
│       ▼                     ▼                                │
│  ┌────────────┐    ┌──────────────┐                          │
│  │ Supabase   │    │ Stellar      │                          │
│  │ Postgres   │    │ Testnet      │                          │
│  │ 16         │    │ (Soroban)    │                          │
│  └────────────┘    └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Security Model

### 6.1 Threat Model

| Threat | Mitigation |
|--------|-----------|
| Single-party falsification | Multi-party approval requires 2–3 independent keys |
| Database compromise | On-chain approvals cannot be altered via DB |
| Key theft | Each role has separate key; attacker needs multiple keys |
| Replay attacks | Soroban transaction sequence numbers prevent replays |
| Evidence tampering | SHA-256 hashes stored on-chain ensure integrity |

### 6.2 Trust Model

- **Zero trust at start** — every new technician starts without reputation
- **Reputation is earned** — each completed maintenance job adds to trust score
- **Verification is public** — anyone can query on-chain approval state
- **No single point of failure** — the system works as long as one honest party participates in each approval chain

### 6.3 Current Limitations

- **Backend is verify-only** — the backend never signs or submits Soroban transactions; all state-changing operations originate from the user's Freighter wallet via the frontend. On-chain state is read back via native Rust RPC simulations (`soroban_rpc.rs`).
- **No IPFS storage without Pinata credentials** — evidence files are hashed but not stored; a production deployment needs IPFS/S3 or equivalent.
- **Cross-contract invocation is wired** — `ComplianceAttestation.issue_certificate` calls `MultiPartyApproval.verify` and `MaintenanceRecords.complete` via `env.invoke_contract`, covered by unit tests.
- **Two-layer API auth is enforced** — the Next.js proxy injects `MAINTCHAIN_API_KEY` and validates an HMAC-signed session cookie; the backend enforces wallet-address ownership via `identity_middleware`. CORS is allow-listed via the `ALLOWED_ORIGINS` env var.

---

## 7. Performance Considerations

| Operation | Expected Latency | Notes |
|-----------|-----------------|-------|
| Frontend page load | <2s | SSG for static pages, client components hydrate |
| API call (backend) | <100ms | Direct Postgres queries, no ORM overhead |
| Soroban simulation | 1–3s | Depends on Soroban RPC endpoint load |
| Soroban submission | 5–15s | Includes polling for transaction completion |
| Evidence upload | <1s file hash; 3–10s IPFS | IPFS varies based on file size |

---

## 8. Testing Strategy

| Layer | Approach | Tooling |
|-------|----------|---------|
| Smart Contracts | Unit tests with Soroban testutils, snapshot tests | `cargo test` |
| Backend | Integration tests via curl against running API | Manual / CI |
| Frontend | Build-time type checking, linting | `npm run build`, `npm run lint` |
| Visual | Browser agent verification | Playwright / manual |

---

## 9. Key Design Decisions & Trade-offs

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| Soroban (vs. Ethereum) | Smaller ecosystem, but lower fees and faster finality | Stellar is designed for asset/approval use cases |
| Rust contracts (no_std) | Steeper learning curve, but WASM-optimized | Soroban's native contract language |
| Dual-path (on + off chain) | Architectural complexity, but best of both worlds | Blockchain where it matters, DB where it doesn't |
| Freighter (vs. custom wallet) | Browser extension dependency, but battle-tested | Most mature Stellar wallet with Soroban support |
| Postgres (vs. IPFS for all data) | Centralized DB dependency, but fast queries | Evidence files need fast access; blockchain for integrity |
| Glass design system (vs. shadcn) | More custom CSS, but distinctive visual identity | Editorial aesthetic differentiates from standard templates |

---

*For the use case and business context, see [PROJECT_GUIDE.md](./PROJECT_GUIDE.md).*  
*For Stellar SDK and contract details, see [STELLAR_INTEGRATION.md](./STELLAR_INTEGRATION.md).*
