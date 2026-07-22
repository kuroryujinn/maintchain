# MaintChain — System Architecture & Design

**Full System Design Document — July 2026**

---

## 1. System Overview

MaintChain is a **three-tier decentralized application (dApp)** comprising:

1. **Smart Contracts** on Stellar Soroban (blockchain layer)
2. **REST Backend** in Rust/Axum with PostgreSQL (off-chain service layer)
3. **Web Frontend** in Next.js 14 with Freighter wallet integration (presentation layer)

The architecture follows a **dual-path pattern**: the frontend communicates with Stellar Testnet directly via Freighter for on-chain operations, and with the REST backend for off-chain CRUD workflows. These two paths are independent yet complementary — the on-chain contracts provide **immutable approval state**, while the off-chain backend provides **flexible data management and supplementary services**.

> **Architecture Diagram:** Open `SYSTEM_DESIGN_DIAGRAM.html` in a browser for an interactive visual representation of this architecture.

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
- `complete_record` — Final transition to Compliant (called by ComplianceAttestation)
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
- `verify_compliance` — Returns `true` only if ALL required roles have approved
- `set_auditor_required` — Configure whether an auditor signature is needed

**Why This Contract:**
This contract is the **heart of the system**. It enforces the multi-party rule that makes MaintChain trustworthy. The `verify_compliance` function is the single source of truth for whether a maintenance record meets compliance requirements.

#### 3.1.4 ComplianceAttestation

**Purpose:** Issue final compliance certificates.

**Key Functions:**
- `issue_certificate` — Verifies compliance via cross-contract call to MultiPartyApproval, issues attestation with cert hash, and updates MaintenanceRecords status to Compliant
- `get_attestation` — Returns stored attestation

**Why This Contract:**
The attestation is the **terminal artifact** of the compliance workflow. It is a permanently verifiable certificate that any party can check without contacting any off-chain system. The cross-contract invocation architecture ensures that certificates are only issued when the approval chain is complete.

### 3.2 Backend (Service Layer)

**Written in Rust** using the Axum web framework. Runs as a Docker container on Render.

#### 3.2.1 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/health/config` | Database URL status (masked) |
| GET | `/equipment` | List all equipment |
| POST | `/equipment` | Register new equipment |
| GET | `/maintenance` | List all maintenance records |
| GET | `/maintenance/:id` | Get specific maintenance record |
| POST | `/maintenance/orders` | Create maintenance order |
| POST | `/maintenance/:id/evidence` | Submit evidence hash |
| GET | `/maintenance/:id/audit` | Get full audit trail |
| POST | `/maintenance/:id/approvals/supervisor` | Supervisor approve |
| POST | `/maintenance/:id/approvals/supervisor/reject` | Supervisor reject |
| POST | `/maintenance/:id/approvals/auditor` | Auditor approve (issue certificate) |
| POST | `/hash/evidence` | Compute SHA-256 hash of payload |
| POST | `/maintenance/:id/evidence/upload` | Upload evidence file (multipart) |
| POST | `/users/register` | Register new user |

#### 3.2.2 Key Backend Components

**Axum Router** (`main.rs`):
- Configures all routes, CORS middleware, Sentry integration
- Manages database connection pool via sqlx
- Handles request/response serialization

**Audit Module** (`audit.rs`):
- `get_audit_trail` — Joins approvals and maintenance records to build a complete audit timeline
- `approve_by_auditor` — Transition to Compliant, issue certificate

**Soroban Client** (`soroban_client.rs`):
- Wraps Soroban RPC calls for contract verification and certificate issuance
- Currently runs in "demo mode" — returns placeholder tx hashes when contract IDs are not configured
- Designed for production upgrade: full Soroban transaction signing via deployer secret key

**Storage Module** (`storage.rs`):
- `compute_file_hash` — SHA-256 hashing of uploaded evidence files
- `upload_to_ipfs` — Pinata IPFS upload (optional, requires Pinata credentials)

#### 3.2.3 Database Schema

**Tables:**
- `equipment` — Equipment records (id, owner_id, metadata_hash, serial_number, name, location)
- `maintenance_records` — Maintenance job state (id, equipment_id, technician_id, status, evidence_hash, created_at)
- `approvals` — Approval events (id, maintenance_id, approver_id, role, decision, timestamp, note)
- `users` — User registration for Stellar wallet linking (id, stellar_address, name, role, organization, created_at)

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
    │       │   ├──→ [Cross-Contract] MultiPartyApproval.verify_compliance → check bitmap
    │       │   └──→ [Cross-Contract] MaintenanceRecords.complete_record → Compliant
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

- Backend SorobanClient runs in demo mode (no real Soroban signing)
- No IPFS storage without Pinata credentials configured
- Cross-contract invocation is scaffolded but not fully wired
- API authentication is demo-grade (not enforced)

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
