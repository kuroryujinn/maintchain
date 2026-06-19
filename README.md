# MaintChain (Soroban + Multi‑Party Verified Maintenance Compliance)

MaintChain is a maintenance compliance platform powered by **Stellar Soroban** smart contracts.

It prevents falsification of industrial maintenance records by enforcing a **multi‑party approval workflow** on‑chain. A maintenance record is only considered *compliant* after the required approvals have been recorded by independent roles (Technician, Supervisor, and optionally Auditor).

## What this repo contains

- **Soroban contracts** (Rust / no_std):
  - `contracts/equipment-registry` — equipment registry
  - `contracts/maintenance-records` — store maintenance proof + evidence hash
  - `contracts/multi-party-approval` — approval engine enforcing multi‑party requirements
  - `contracts/compliance-attestation` — issues a compliance attestation (cert)

- **Backend** (Rust / Axum + Postgres migrations):
  - API + persistence for the demo workflow and audit trail

- **Frontend** (Next.js):
  - UI flow for approvals, evidence upload (off-chain), and audit display

- **Docs**:
  - `docs/demo-scenario.md` — end-to-end scenario
  - `docs/domain.md` — domain model overview
  - `docs/ci-cd.md` — proposed pipeline

## How compliance works (high level)

1. Equipment is registered in `equipment-registry`.
2. A maintenance record is created in `maintenance-records`.
3. Evidence is kept **off-chain** (e.g., IPFS). Only a **hash** is stored on-chain.
4. Approval states are tracked in `multi-party-approval`:
   - Technician approves
   - Supervisor approves/rejects
   - Auditor approval is required only when configured
5. When all required approvals are satisfied, the record becomes **COMPLIANT**.
6. `compliance-attestation` issues the final certificate.

---

# For the multi-party approval contract
Transaction transaction on Stellar Testnet::
🔗 https://stellar.expert/explorer/testnet/tx/f6378948f57e4d6555308c39e1e3cdc5e61522eb18119a84194299b8dda0ac53

Testnet deployment link:
🔗 https://lab.stellar.org/r/testnet/contract/CBPHZFRYKSE6PUWHU2HSNQTWBQ47GYV3U73KXPSOPIX3QLQJ7MLSJOYH

# For Equipment_registry contract
Testnet transaction link:
🔗 https://stellar.expert/explorer/testnet/tx/037c5b9f2204df92e975111e9d7d96027b90b9ae26c89aaeccf595414fab7863
Testnet deployment link:
🔗 https://lab.stellar.org/r/testnet/contract/CAT57KYD2WU5QMNBSGB4FJQ37JUUQRKFDMZVPTJZVFC2H44EKWKZWWEW

# For Maintenance_records contract
Testnet transaction link:
🔗 https://stellar.expert/explorer/testnet/tx/bb8e10e0d5ce6d85e5019d5da8650e6cd1ec85c05f937041183c7097c1b06aae
Testnet deployment link:
🔗 https://lab.stellar.org/r/testnet/contract/CBRIGG27YRAXG5H74ZOWSSJGMSTPQHZXJCDXA23QSSBIH6VYZZR4775Z

# For Compliance_attestation contract
Testnet transaction link:
🔗 https://stellar.expert/explorer/testnet/tx/295cf00852671856ea524a69bafd2bc1c159a73d18ffc411749fc6312f11b1ef

Testnet deployment link:
🔗 https://lab.stellar.org/r/testnet/contract/CBR4HHPWRDXMJJOG65B6I5TRIBBUFAXAMUCTAJANAPBAIJHPKRUTCVIN

## Demo scenario

See: `docs/demo-scenario.md`

It includes a rejected supervisor submission followed by a successful resubmission to demonstrate the multi‑party enforcement.

## Local development (contracts)

### Build Soroban contracts

From the repo root:

```bash
cd contracts
cargo build
```

To build WASM artifacts for Soroban:

```bash
cargo build --target wasm32v1-none --release
```

> Note: Soroban’s SDK does not support `wasm32-unknown-unknown` on older Rust toolchains.

### WASM artifacts

After building release WASM, the expected artifact paths are under:

- `target/wasm32v1-none/release/<contract_name>.wasm`

## Important: deploy artifacts (debug vs release)

When deploying with `stellar contract deploy`, you must deploy the **release** WASM.

Deploying a `debug` artifact can lead to RPC errors like `HTTP 413 (Payload Too Large)` because the debug WASM can be significantly larger.

Use:

- `target/wasm32v1-none/release/multi_party_approval.wasm`

and avoid:

- `target/wasm32v1-none/debug/multi_party_approval.wasm`

## Backend

Migrations:
- `backend/migrations/*.sql`

The backend MVP uses Postgres and is intended to support the demo workflow.

## Deployment / CI (work-in-progress)

See: `docs/ci-cd.md`

The repo currently contains a runnable backend and contract crates; the pipeline description is proposed and not fully wired into hosted CI yet.

## Frontend: Stellar Testnet Wallet (Freighter)

The MaintChain frontend integrates with **Freighter** to:
- Connect/disconnect a Stellar Testnet account
- Persist the connected public address across refresh
- Fetch the connected account’s **XLM balance** from **Horizon (Testnet)**
- Send **real** XLM testnet payments using the Freighter signing flow
- Provide a Freighter-backed contract invocation helper (`callContract`)

### Wallet setup
1. Install the **Freighter** browser extension.
2. Open the app’s frontend.
3. Click **“Connect Wallet”**.
4. Confirm the Freighter authorization prompt.
5. The dashboard will display:
   - Connected Stellar public address
   - XLM balance fetched from Horizon (Testnet)
   - “Send XLM” form (destination + amount)

### Testnet configuration
The frontend currently uses **Stellar Testnet** constants and the Horizon endpoint:
- Horizon: `https://horizon-testnet.stellar.org`
- Network passphrase: `Networks.TESTNET`

If you deploy to a different network, update:
- `frontend/src/hooks/useSoroban.ts` (Horizon URL + network passphrase)

### Send XLM
Use **Send XLM (Testnet)**:
- Destination: any valid Stellar public address
- Amount: XLM amount > 0
- After Freighter signs/submits, the UI displays the transaction hash (which you can verify in Stellar Expert)

---

## Architecture (high level)

```text
  Browser (Next.js + UI)
        |
        |  Freighter wallet injection (window.Freighter)
        v
  Freighter signing flow
        |
        v
  Stellar Testnet (Horizon)
   - account balance
   - submit payment tx
        ^
        |
  Backend (Axum + Postgres)
        |
        |  audit trail & maintenance workflow
        v
   Postgres + migrations
```

---

## Repo notes

- Contracts are intentionally small “work-in-progress” implementations to support the demo.
- Some cross-contract wiring may be stubbed until the deploy flow and invocation wiring is finalized.

