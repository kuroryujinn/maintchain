# MaintChain — Stellar SDK & Smart Contract Integration

**Deep-Dive on Blockchain Architecture — July 2026**

---

## 1. Why Stellar / Soroban?

MaintChain chose Stellar Soroban over other smart contract platforms for specific architectural and economic reasons:

| Factor | Stellar Soroban | Alternative (Ethereum) | Why It Matters |
|--------|----------------|----------------------|----------------|
| **Contract fees** | ~0.001 XLM (~$0.0001) | $1–$50+ per tx | Industrial workflows need many approvals — cost must be near zero |
| **Finality** | 3–5 seconds | 12–15 seconds | Maintenance crews can't wait minutes for a transaction to confirm |
| **Asset model** | Native asset support | ERC-20 complexity | Stellar's built-in asset model maps naturally to equipment/approval tokens |
| **Contract language** | Rust (no_std, WASM) | Solidity / EVM | Rust provides memory safety guarantees for safety-critical industrial code |
| **Identity** | Stellar accounts with signing keys | Ethereum accounts | Freighter wallet provides production-grade key management |
| **Settlement finality** | Deterministic (consensus) | Probabilistic (PoW/PoS) | Industrial audit trails need definitive finality |

**Decision:** Soroban's deterministic finality, near-zero fees, and Rust-based development environment make it the best fit for industrial compliance workflows where low cost, fast confirmation, and safety-critical correctness are paramount.

---

## 2. Stellar SDK Components Used

MaintChain integrates with Stellar at multiple layers:

### 2.1 Frontend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `@stellar/stellar-sdk` | ^13.0.0 | Transaction building, XDR encoding/decoding, Horizon interaction |
| `@stellar/freighter-api` | ^6.0.1 | Wallet connection, account access, transaction signing |

**Key SDK integrations in `frontend/src/lib/soroban.ts`:**

```typescript
// Build Soroban contract call
import { Contract, TransactionBuilder, Networks, BASE_FEE } from '@stellar/stellar-sdk';

const contract = new Contract(contractId);
const op = contract.call(method, ...args);

// Build transaction with Soroban data
const tx = new TransactionBuilder(sourceAccount, {
  fee: BASE_FEE,
  networkPassphrase: Networks.TESTNET,
  sorobanData: new SorobanDataBuilder(simulationData).build(),
})
  .addOperation(op)
  .setTimeout(30)
  .build();
```

```typescript
// Sign with Freighter
import { signTransaction } from '@stellar/freighter-api';

const signed = await signTransaction(txXDR, {
  networkPassphrase: NETWORK_PASSPHRASE,
  address: sourceAddress,
});
```

### 2.2 Backend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `soroban-sdk` | 21 | Soroban contract types and XDR parsing |
| `stellar-xdr` | 21 | Stellar XDR serialization/deserialization |
| `stellar-rpc-client` | 21 | Soroban RPC communication (not currently wired) |

### 2.3 Horizon Integration

The frontend uses **Horizon Testnet** (`https://horizon-testnet.stellar.org`) for:
- Account balance lookups (native XLM)
- Account sequence number for transaction building
- XLM payment submission (for token transfers between users)

```typescript
import { Horizon, Asset, Operation } from '@stellar/stellar-sdk';

const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const sourceAccount = await server.loadAccount(address);
const result = await server.submitTransaction(signedTx);
```

### 2.4 Networks & Passphrases

| Network | Passphrase | Usage |
|---------|-----------|-------|
| Stellar Testnet | `Test SDF Network ; September 2015` | All current development and deployment |
| Stellar Mainnet | `Public Global Stellar Network ; September 2015` | Future production deployment |

---

## 3. Smart Contract Architecture

### 3.1 Contract Dependencies

```
ComplianceAttestation
    │
    ├── calls → MultiPartyApproval.verify_compliance()
    │             (cross-contract: "verify" symbol, 6 chars)
    │
    └── calls → MaintenanceRecords.complete_record()
                  (cross-contract: "complete" symbol, 8 chars)
```

### 3.2 Common Design Patterns

**Versioned Storage:**
EquipmentRegistry uses instance storage with version keys:
```rust
env.storage().instance().set(&equipment_id, &version);           // Latest version pointer
env.storage().instance().set(&(equipment_id, version), &snap); // Versioned snapshot
```
This allows retrieving any historical version while keeping lookups O(1).

**Self-Certifying Hashes:**
Each equipment record includes a hash computed from all immutable fields:
```
equipment_hash = SHA256("EQUP" || equipment_id || metadata_hash || created_at || version)
```
This means the hash itself certifies the content — no external oracle needed.

**Approval Bitmap:**
MultiPartyApproval stores approvals as a boolean bitmap, enabling O(1) compliance verification:
```rust
fn verify_compliance(env, maintenance_id) -> bool {
    let state = load_approval_state(maintenance_id);
    state.tech_approved && state.supervisor_approved
        && (!state.auditor_required || state.auditor_approved)
}
```

**Symbol-Limited Cross-Contract Invocation:**
Soroban SDK v21 restricts cross-contract function symbols to ≤9 characters. MaintChain adheres to this:
- `"verify"` (6 chars) → MultiPartyApproval.verify_compliance
- `"complete"` (8 chars) → MaintenanceRecords.complete_record

---

## 4. Contract Deep-Dives

### 4.1 EquipmentRegistry

**File:** `contracts/equipment-registry/src/lib.rs`
**Deployed:** [`CAT57KYD2WU5QMNBSGB4FJQ37JUUQRKFDMZVPTJZVFC2H44EKWKZWWEW`](https://lab.stellar.org/r/testnet/contract/CAT57KYD2WU5QMNBSGB4FJQ37JUUQRKFDMZVPTJZVFC2H44EKWKZWWEW)
**Deploy TX:** [`037c5b9f2204df92e975111e9d7d96027b90b9ae26c89aaeccf595414fab7863`](https://stellar.expert/explorer/testnet/tx/037c5b9f2204df92e975111e9d7d96027b90b9ae26c89aaeccf595414fab7863)

**Purpose:** Register industrial equipment and track ownership via versioned snapshots.

**Data Structure:**
```rust
struct EquipmentSnapshot {
    equipment_id: BytesN<32>,  // 32-byte identifier (zero-extended UUID)
    version: u32,              // Monotonically increasing
    owner: Address,            // Stellar address of current owner
    metadata_hash: BytesN<32>, // Hash of off-chain metadata
    equipment_hash: BytesN<32>,// Self-certifying content hash
    created_at: u64,           // Ledger timestamp
}
```

**Canonical Hash Computation:**
```
preimage = "EQUP" || equipment_id_bytes(32) || metadata_hash_bytes(32)
           || created_at_be(8) || version_be(4)

equipment_hash = SHA256(preimage)
```

**Public Functions:**
- `register_equipment(equipment_id, owner, metadata_hash) → equipment_hash`
  - Registers new equipment with version 1
  - Panics if equipment_id already exists
- `update_owner(equipment_id, new_owner) → equipment_hash`
  - Creates new version snapshot with incremented version
  - Preserves metadata_hash from previous version
- `get_equipment(equipment_id) → EquipmentSnapshot`
  - Returns latest version
- `get_equipment_version(equipment_id, version) → EquipmentSnapshot`
  - Returns specific historical version

**Tests:** 3 unit tests covering registration, latest version retrieval, and owner transfer with hash verification.

### 4.2 MaintenanceRecords

**File:** `contracts/maintenance-records/src/lib.rs`
**Deployed:** [`CBRIGG27YRAXG5H74ZOWSSJGMSTPQHZXJCDXA23QSSBIH6VYZZR4775Z`](https://lab.stellar.org/r/testnet/contract/CBRIGG27YRAXG5H74ZOWSSJGMSTPQHZXJCDXA23QSSBIH6VYZZR4775Z)
**Deploy TX:** [`bb8e10e0d5ce6d85e5019d5da8650e6cd1ec85c05f937041183c7097c1b06aae`](https://stellar.expert/explorer/testnet/tx/bb8e10e0d5ce6d85e5019d5da8650e6cd1ec85c05f937041183c7097c1b06aae)

**Purpose:** State machine for individual maintenance jobs.

**State Machine:**
```
Open (0) → Submitted (1) → PendingApproval (2) → Compliant (3)
                              ↓
                          Rejected (4)
```

**Data Structure:**
```rust
struct MaintenanceOrder {
    equipment_id: BytesN<32>,
    tech_id: Address,
    status: MaintenanceStatus,  // Enum: Open=0 ... Rejected=4
    evidence_hash: Option<BytesN<32>>,
    created_at: u64,
}
```

**Public Functions:**
- `create_record(maintenance_id, equipment_id, tech_id)`
  - Creates new maintenance order in Open status
- `submit_evidence(maintenance_id, evidence_hash)`
  - Stores evidence hash and transitions to Submitted
- `update_status(maintenance_id, new_status)`
  - General status transition (intended for cross-contract orchestration)
- `complete_record(maintenance_id)`
  - Transitions from PendingApproval to Compliant
  - **Guard:** Only callable when status == PendingApproval
  - **Designed to be called by ComplianceAttestation**
- `get_record(maintenance_id) → MaintenanceOrder`

### 4.3 MultiPartyApproval

**File:** `contracts/multi-party-approval/src/lib.rs`
**Deployed:** [`CBPHZFRYKSE6PUWHU2HSNQTWBQ47GYV3U73KXPSOPIX3QLQJ7MLSJOYH`](https://lab.stellar.org/r/testnet/contract/CBPHZFRYKSE6PUWHU2HSNQTWBQ47GYV3U73KXPSOPIX3QLQJ7MLSJOYH)
**Deploy TX:** [`f6378948f57e4d6555308c39e1e3cdc5e61522eb18119a84194299b8dda0ac53`](https://stellar.expert/explorer/testnet/tx/f6378948f57e4d6555308c39e1e3cdc5e61522eb18119a84194299b8dda0ac53)

**Purpose:** The enforcement point — tracks approval state across roles. This is the **most important contract** in the system.

**Data Structure:**
```rust
struct ApprovalState {
    tech_approved: bool,
    supervisor_approved: bool,
    auditor_approved: bool,
    auditor_required: bool,  // Configurable per record
}
```

**Public Functions:**
- `set_auditor_required(maintenance_id, required)`
  - Configure whether auditor approval is needed
  - Default: not required
- `approve_by_technician(maintenance_id)`
  - Sets tech_approved = true
- `approve_by_supervisor(maintenance_id, decision)`
  - Parses first byte of decision: 1 = APPROVED, 0 = REJECTED
  - Sets supervisor_approved accordingly
- `reject_by_supervisor(maintenance_id)`
  - Explicitly sets supervisor_approved = false
- `approve_by_auditor(maintenance_id)`
  - Sets auditor_approved = true
- `verify_compliance(maintenance_id) → bool`
  - Returns true ONLY if: tech_approved AND supervisor_approved AND (auditor_ok)
  - auditor_ok = auditor_approved IF auditor_required ELSE true

**Why This Contract Is the Enforcement Point:**
No off-chain logic can mark a record compliant without going through this contract. The `verify_compliance` function is the **single source of truth** for whether a maintenance record meets compliance requirements. Even if the database is compromised, the on-chain approval bitmap remains authoritative.

### 4.4 ComplianceAttestation

**File:** `contracts/compliance-attestation/src/lib.rs`
**Deployed:** [`CBR4HHPWRDXMJJOG65B6I5TRIBBUFAXAMUCTAJANAPBAIJHPKRUTCVIN`](https://lab.stellar.org/r/testnet/contract/CBR4HHPWRDXMJJOG65B6I5TRIBBUFAXAMUCTAJANAPBAIJHPKRUTCVIN)
**Deploy TX:** [`295cf00852671856ea524a69bafd2bc1c159a73d18ffc411749fc6312f11b1ef`](https://stellar.expert/explorer/testnet/tx/295cf00852671856ea524a69bafd2bc1c159a73d18ffc411749fc6312f11b1ef)

**Purpose:** Issue final compliance certificates with cross-contract validation.

**Data Structure:**
```rust
struct Attestation {
    issued_at: u64,
    issuer: Address,           // The ComplianceAttestation contract address
    cert_hash: BytesN<32>,     // Hash of the certificate content
}
```

**Public Functions:**
- `issue_certificate(approval_contract_id, records_contract_id, maintenance_id, cert_hash) → cert_hash`
  1. Calls `MultiPartyApproval.verify_compliance(maintenance_id)` via cross-contract invocation
  2. Panics if not eligible
  3. Stores attestation with current timestamp and contract address
  4. Calls `MaintenanceRecords.complete_record(maintenance_id)` via cross-contract invocation
  5. Returns cert_hash
- `get_attestation(maintenance_id) → Attestation`

**Cross-Contract Invocation (v21 Soroban SDK):**
```rust
let args: soroban_sdk::Vec<Val> = vec![&env, maintenance_id.into_val(&env)];
let is_eligible: bool = env.invoke_contract(
    &approval_contract_id,
    &symbol_short!("verify"),  // 6-char symbol
    args,
);
```

Note: Cross-contract invocation is **scaffolded but has a known limitation** — the Soroban SDK v21 `symbol_short!` macro has specific length constraints that require matching symbol names across contracts. This is documented as an active work item.

---

## 5. Frontend → Contract Integration

### 5.1 Contract Invocation Pipeline

The frontend implements a complete Soroban transaction lifecycle in `frontend/src/lib/soroban.ts`:

```
1. Parse contract ID + method + args
2. Build initial Transaction with Contract.call operation
3. Fetch account sequence from Soroban RPC
4. Simulate via Soroban RPC (gets footprint + resource fees)
5. Parse SorobanTransactionData from simulation response
6. Build final Transaction with correct sorobanData
7. Sign with Freighter (signTransaction)
8. Submit to Soroban RPC (sendTransaction)
9. Poll getTransaction up to 15 times (1s interval)
10. Return { transactionHash, status }
```

### 5.2 Read-Only Simulations

For `verify_compliance` and `get_equipment` (read-only operations), the frontend uses `simulateContract` which skips the signing and submission steps:

```
1. Build transaction with dummy source account
2. Add Memo.text('simulate') to distinguish from real transactions
3. POST to /simulateTransaction
4. Parse return value from simulation.result.retval
```

### 5.3 Argument Serialization

The frontend handles Stellar XDR serialization for contract arguments:

```typescript
// Simple values → ScVal
import { nativeToScVal } from '@stellar/stellar-sdk';
// Used for: numbers, booleans, strings

// BytesN<32> from hex string
export function bytes32ScVal(hex: string): xdr.ScVal {
  const bytes = Buffer.from(hex.replace('0x', '').padStart(64, '0'), 'hex');
  return xdr.ScVal.scvBytes(bytes);
}
// Used for: equipment IDs, maintenance IDs, hashes

// String → BytesN<32> hex
export function toBytesN32(str: string): string {
  const encoded = new TextEncoder().encode(str.padEnd(32, '\0'));
  return '0x' + Array.from(encoded).map(b => b.toString(16).padStart(2, '0')).join('');
}
// Used for: converting UUIDs to 32-byte Soroban identifiers
```

### 5.4 Usage at Each Frontend Route

| Route | Contract(s) Called | Method | Type |
|-------|-------------------|--------|------|
| `/dashboard` | MultiPartyApproval | `verify_compliance` | Simulate (read) |
| `/upload` | MaintenanceRecords | `submit_evidence` | Invoke (write) |
| `/approve` | MultiPartyApproval | `approve_by_supervisor` | Invoke (write) |
| `/audit` | ComplianceAttestation | `issue_certificate` | Invoke (write) |
| `/technician` | MultiPartyApproval | `approve_by_technician` | Invoke (write) |

---

## 6. Backend → Contract Integration

### 6.1 SorobanClient (`backend/src/soroban_client.rs`)

The backend includes a `SorobanClient` that wraps Soroban RPC calls. Currently in **demo mode** — returns placeholder transaction hashes when contract IDs are not configured.

**Current implementation:**
```rust
pub async fn verify_compliance(&self, maintenance_id_bytes: &[u8]) -> Result<bool, StatusCode> {
    // Falls back to local database state as source of truth
    // In production: build tx → simulate via RPC → parse boolean result
    Ok(true)
}

pub async fn issue_certificate(&self, ...) -> Result<String, StatusCode> {
    // Generates placeholder tx ID
    // In production: build tx → simulate → sign with deployer key → submit → poll
    Ok(format!("tx_soroban_{}", uuid::Uuid::new_v4()))
}
```

**Planned production upgrade:**
1. Build Soroban transaction calling `ComplianceAttestation.issue_certificate`
2. Simulate via Soroban RPC for footprint + resource fees
3. Sign with deployer secret key (configured via `DEPLOYER_SECRET_KEY` env var)
4. Submit to Soroban RPC
5. Poll `getTransaction` for completion
6. Return the real transaction hash

---

## 7. Contract Deployment Pipeline

### 7.1 Deployment Script

`scripts/deploy-contracts.mjs` automates WASM upload + contract deployment:

```
1. Build contracts: cargo build --target wasm32v1-none --release
2. For each contract:
   a. Upload WASM blob to Soroban RPC (POST /restore + POST /upload)
   b. Deploy contract from WASM hash
   c. Print contract ID
3. Generate .env.local entries with all contract IDs
```

### 7.2 Deployed Contracts Summary

| Contract | Address | Deploy TX | Status |
|----------|---------|-----------|--------|
| EquipmentRegistry | `CAT57...WWEW` | `037c5...7863` | ✅ Testnet |
| MaintenanceRecords | `CBRI...775Z` | `bb8e1...aae` | ✅ Testnet |
| MultiPartyApproval | `CBPH...JOYH` | `f6378...ac53` | ✅ Testnet |
| ComplianceAttestation | `CBR4...VIN` | `295cf...1ef` | ✅ Testnet |

### 7.3 Environment Variables

```env
# Frontend (NEXT_PUBLIC_ prefix for client-side access)
NEXT_PUBLIC_EQUIPMENT_REGISTRY_ID=CAT57KYD2WU5QMNBSGB4FJQ37JUUQRKFDMZVPTJZVFC2H44EKWKZWWEW
NEXT_PUBLIC_MAINTENANCE_RECORDS_ID=CBRIGG27YRAXG5H74ZOWSSJGMSTPQHZXJCDXA23QSSBIH6VYZZR4775Z
NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID=CBPHZFRYKSE6PUWHU2HSNQTWBQ47GYV3U73KXPSOPIX3QLQJ7MLSJOYH
NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID=CBR4HHPWRDXMJJOG65B6I5TRIBBUFAXAMUCTAJANAPBAIJHPKRUTCVIN
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Backend (for backend-initiated contract calls)
APPROVAL_CONTRACT_ID=<same_as_above>
RECORDS_CONTRACT_ID=<same_as_above>
ATTESTATION_CONTRACT_ID=<same_as_above>
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
DEPLOYER_SECRET_KEY=<testnet_secret_key>  # Required for full signing
```

---

## 8. Testing & Validation

### 8.1 Contract Unit Tests

```bash
cd contracts
cargo test                          # All contracts
cargo test -p equipment-registry    # EquipmentRegistry (3 tests + snapshots)
cargo test -p maintenance-records   # MaintenanceRecords
cargo test -p multi-party-approval  # MultiPartyApproval
cargo test -p compliance-attestation # ComplianceAttestation
```

### 8.2 Snapshot Tests

EquipmentRegistry includes Soroban snapshot tests in `contracts/equipment-registry/test_snapshots/tests/`:
- `test_register_equipment_stores_snapshot.1.json`
- `test_get_equipment_returns_latest_version.1.json`
- `test_update_owner_creates_new_version_snapshot.1.json`

Snapshots capture the full ledger state after each test, enabling regression detection across Soroban SDK upgrades.

### 8.3 Frontend Validation

```bash
cd frontend
npm run build    # TypeScript compilation + ESLint
npm run lint     # Next.js linting
```

The build generates 18 static pages. All contract interaction code is validated at build time through TypeScript's type system.

---

## 9. Known Limitations & Roadmap

| Limitation | Impact | Target |
|-----------|--------|--------|
| Cross-contract invocation stubbed | Certificate issuance works but doesn't trigger on-chain status update | Q3 2026 |
| Backend SorobanClient in demo mode | Backend-initiated contract calls use placeholder tx hashes | Q3 2026 |
| No Soroban SDK v22 migration | v22 changed cross-contract API; upgrading required for latest features | Q4 2026 |
| Single Soroban RPC endpoint | No fallback if endpoint is slow or unavailable | Q4 2026 |
| No mainnet deployment | Contracts only on Testnet | Q1 2027 |

---

*For the overall project guide, see [PROJECT_GUIDE.md](./PROJECT_GUIDE.md).*  
*For the full system design, see [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md).*
