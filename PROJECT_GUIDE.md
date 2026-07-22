# MaintChain

## A Verifiable Trust Network for Industrial Maintenance

**Whitepaper — July 2026**

---

## 1. Executive Summary

MaintChain is a decentralized compliance platform that makes industrial maintenance records **provably tamper-proof**. By combining Stellar Soroban smart contracts with a modern web application, MaintChain creates an immutable audit trail for every repair, inspection, and certification event across industrial equipment.

The core insight is simple: **a maintenance record is only trustworthy when multiple independent parties have cryptographically signed off on it**. MaintChain enforces this through a multi-party approval workflow on-chain — technician submits evidence, supervisor verifies, auditor certifies — and every step is permanently recorded on the Stellar blockchain. No single participant can rewrite history.

---

## 2. The Problem: Industrial Maintenance Record Tampering

### 2.1 The Scale of the Problem

Industrial maintenance records — repair logs, inspection reports, compliance certificates — form the backbone of safety, insurance, and regulatory compliance across manufacturing, energy, aviation, mining, and transportation. Yet these records remain vulnerable to a fundamental flaw: **they are mutable**.

| Sector | Annual Cost of Record Fraud | Key Risk |
|--------|---------------------------|----------|
| Aerospace | $4.2B (parts counterfeiting) | Safety failures |
| Oil & Gas | $2.8B (compliance falsification) | Environmental disasters |
| Manufacturing | $1.9B (warranty fraud) | Liability exposure |
| Maritime | $1.1B (certificate forgery) | Port detention |

*Source: Industry estimates, 2024–2025*

### 2.2 Why Current Systems Fail

**Paper-based systems:** Physical logs can be altered, lost, or destroyed. A single pen stroke can falsify an inspection record, and there is no way to prove the original state.

**Digital databases:** Centralized databases are controlled by a single organization. An operator, plant manager, or administrator with database access can modify records without detection. Audit logs can be truncated.

**Single-party approvals:** Even when digital systems exist, they rarely require independent verification. One person's approval is rarely audited by other roles, creating single points of failure.

**Siloed reputation:** A technician's work history does not travel with them. A skilled welder who produced flawless repair records at one plant starts from zero credibility at the next employer.

### 2.3 The Trust Gap

The fundamental problem is **incentive incompatibility**: no existing system chains approvals together in a way that makes falsification provably expensive and honest work provably cheap to verify. This gap costs industries billions annually in fraud, compliance penalties, and redundant inspections.

---

## 3. The Solution: MaintChain

MaintChain closes the trust gap by enforcing a **multi-party cryptographic approval workflow** on the Stellar blockchain.

### 3.1 Core Innovation

MaintChain's innovation is not just recording data on a blockchain — it's the **approval chain** that makes falsification economically irrational. To fake a single maintenance record, an attacker would need to:

1. Compromise the technician's Stellar key pair
2. Compromise the supervisor's key pair
3. Compromise the auditor's key pair (if required)
4. Create a false maintenance order
5. Fabricate matching evidence hashes
6. Create a false equipment registration with matching ownership history

Each step is independently verifiable on-chain. The cost of collusion across multiple independent parties exceeds any plausible benefit from falsifying a single maintenance record.

### 3.2 How It Works: The Compliance Flow

```
Fault Detected → Worker Accepts → Evidence Uploaded
    → Evidence Verified → Approval Chain → Certificate Generated
```

**Stage 1 — Fault Detection:** Equipment sensor or human inspector identifies a maintenance issue. The equipment is flagged in the system.

**Stage 2 — Work Assignment:** A technician is assigned to the job. The assignment is recorded in the backend database. The technician accepts the order on-chain via the `MaintenanceRecords` contract.

**Stage 3 — Evidence Upload:** The technician performs the repair, documents the work (photos, readings, parts replaced), and uploads the evidence. A SHA-256 hash of the evidence is computed and stored on-chain via `MaintenanceRecords.submit_evidence`. The evidence files themselves remain off-chain (backed by IPFS when available).

**Stage 4 — Evidence Verification:** The supervisor reviews the evidence against the work order. The evidence hash on-chain ensures the supervisor is reviewing exactly what the technician submitted — any alteration would produce a different hash.

**Stage 5 — Multi-Party Approval:** The supervisor approves (or rejects) the work on-chain via `MultiPartyApproval.approve_by_supervisor`. If the configuration requires it, an auditor also signs off via `MultiPartyApproval.approve_by_auditor`. The contract's `verify_compliance` function returns `true` only when **all** required parties have approved.

**Stage 6 — Certificate Generation:** Once compliance is verified, the `ComplianceAttestation` contract issues a final certificate containing the issuer address, cert hash, and timestamp. The certificate is permanently stored on-chain and visible to any party.

### 3.3 The On-Chain / Off-Chain Boundary

| Data Type | Location | Rationale |
|-----------|----------|-----------|
| Approval signatures | On-chain (MultiPartyApproval) | Immutable — no single party can rewrite history |
| Evidence hashes | On-chain (MaintenanceRecords) | Proof-of-existence without storing large files |
| Equipment ownership & versions | On-chain (EquipmentRegistry) | Verifiable chain of custody |
| Compliance certificates | On-chain (ComplianceAttestation) | Publicly verifiable at any time |
| Evidence files (photos, PDFs) | Off-chain (backend + IPFS) | Cost-prohibitive on-chain |
| Worker profiles & reviews | Off-chain (Postgres) | High churn, not safety-critical |
| Machine metadata | Off-chain (Postgres) | Updated frequently, not part of audit |
| Audit trail logs | Off-chain (Postgres) | Supplementary to on-chain approvals |

---

## 4. Key Stakeholders

### 4.1 Technicians
Field workers who perform maintenance and submit evidence. MaintChain gives them a **portable trust score** that travels with them across employers. A technician with a high score needs fewer audits and commands higher rates.

### 4.2 Supervisors
Site-level managers who verify evidence and approve work. Their approval is the second signature in the compliance chain. By approving quality work, they build their own reputation as reliable verifiers.

### 4.3 Auditors
External or internal auditors who issue final compliance certificates. Their certification is the terminal state in the approval chain. Auditors provide independent verification prized by regulators and insurers.

### 4.4 Equipment Owners
Companies that own industrial equipment. They get a verifiable, tamper-proof maintenance history that satisfies regulatory requirements, reduces insurance premiums, and increases equipment resale value.

### 4.5 Regulators & Insurers
External parties who need to verify compliance without relying on any single organization's database. MaintChain gives them direct on-chain access to the approval chain — no API keys, no data access requests, no trust required.

---

## 5. Use Case Scenarios

### 5.1 Aviation — Engine Overhaul Verification

*An aircraft engine undergoes a 5,000-hour inspection. The technician replaces three turbine blades, documents the work with 12 photos and torque readings, and submits the evidence. The supervisor reviews the evidence hash on-chain, confirms the parts are from an approved supplier, and approves. An FAA auditor later verifies the entire chain in 30 seconds — no filing cabinets, no phone calls.*

**Value:** Avoids $500K+ in redundant inspection costs and eliminates the risk of falsified maintenance logs grounding aircraft.

### 5.2 Oil & Gas — Pipeline Valve Certification

*A critical valve on a natural gas pipeline requires annual certification. The technician performs the inspection, uploads pressure test results, and records the repair. The supervisor approves. A third-party auditor issues the certificate. The regulator accesses the on-chain attestation at audit time.*

**Value:** Meets regulatory requirements (PHMSA, API 510) with provable compliance. Prevents $2M+ fines from record-keeping violations.

### 5.3 Manufacturing — Equipment Resale

*A manufacturing plant sells a CNC machine. The buyer requests the full maintenance history. Instead of sharing a PDF (which could be fabricated), the seller provides the equipment ID. The buyer queries the on-chain equipment registry, sees every version of ownership and every maintenance record ever filed against that machine.*

**Value:** Increases resale value by 15–25% by providing verified maintenance history. Eliminates warranty disputes.

### 5.4 Maritime — Vessel Certificate Management

*A cargo ship's fire suppression system requires quarterly inspection. The technician certifies the work on-chain. The captain (supervisor) reviews and approves. The classification society (auditor) issues the digital certificate. At port inspection, the authorities verify the certificate on-chain without requesting paper documents.*

**Value:** Avoids port detention ($50K–$200K per day) and simplifies Port State Control inspections.

---

## 6. Impact & Benefits

### 6.1 For Technicians
- **Portable reputation:** Trust score travels with you across employers
- **Reduced oversight:** High-trust technicians face fewer audits
- **Market differentiation:** Verified work history commands premium rates
- **Career mobility:** Proven track record opens doors at new employers

### 6.2 For Companies
- **Verifiable compliance:** Tamper-proof audit trail satisfies regulators
- **Reduced insurance premiums:** Provable maintenance history lowers risk profile
- **Equipment value:** Verified maintenance history increases resale value 15–25%
- **Operational efficiency:** Eliminates redundant inspections and paper chasing

### 6.3 For Regulators & Insurers
- **Direct verification:** No reliance on any single organization's database
- **Reduced fraud:** Multi-party approval makes falsification economically irrational
- **Lower audit costs:** 30-second verification vs. days of document chasing
- **Data portability:** Certificates survive operator shutdown or acquisition

### 6.4 Broader Impact
- **Environmental safety:** Verifiable maintenance reduces equipment failures, leaks, and emissions
- **Worker safety:** Tamper-proof logs ensure proper inspections actually happened
- **Market efficiency:** Trust scores create economic incentives for quality work
- **Regulatory innovation:** Enables a new model of transparent, self-verifying compliance

---

## 7. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Blockchain** | Stellar Soroban (Testnet) | Smart contract execution & on-chain state |
| **Smart Contracts** | Rust (`no_std`, wasm32v1-none) | 4 independent contract crates |
| **Backend** | Rust (Axum) | REST API, Postgres, evidence hashing |
| **Database** | PostgreSQL 16 (Supabase) | Off-chain records, user data, audit logs |
| **Frontend** | Next.js 14 (App Router) | Web application, Freighter integration |
| **Styling** | Tailwind CSS v4 | Editorial + Glass design system |
| **Wallet** | Freighter Browser Extension | Stellar key management & transaction signing |
| **Monitoring** | Sentry | Error tracking & performance monitoring |
| **Hosting** | Vercel (frontend) + Render (backend) | Production deployment |

---

## 8. Current Status & Roadmap

### 8.1 Completed
- ✅ 4 Soroban smart contracts deployed on Stellar Testnet
- ✅ Axum REST backend with Postgres (equipment CRUD, maintenance orders, approvals, audit)
- ✅ Next.js 14 frontend with 14+ routes (landing, dashboard, upload, approve, audit, workers, etc.)
- ✅ Wallet integration (Freighter connect/disconnect, balance, XLM transfer, contract calls)
- ✅ Soroban contract invocation pipeline (simulate → sign → submit → poll)
- ✅ Evidence hashing (SHA-256) and IPFS upload (Pinata)
- ✅ Multi-party approval workflow (technician → supervisor → auditor)
- ✅ Compliance attestation with on-chain certificate issuance
- ✅ Mobile responsive UI with glass design system
- ✅ Sentry error tracking (frontend + backend)
- ✅ User feedback collection widget

### 8.2 In Progress
- 🔄 Cross-contract invocation wiring (ComplianceAttestation → MaintenanceRecords)
- 🔄 Full Soroban RPC signing flow from backend (currently uses demo mode)
- 🔄 CI/CD pipeline automation
- 🔄 User onboarding (target: 10+ real users)

### 8.3 Roadmap
| Quarter | Milestone |
|---------|-----------|
| Q3 2026 | Cross-contract invocation wired; full Soroban signing from backend |
| Q4 2026 | IPFS/Arweave production storage; certificate verification portal |
| Q1 2027 | Mobile app (React Native); Stellar mainnet deployment |
| Q2 2027 | Enterprise SSO, custom audit rules engine, API marketplace |

---

## 9. Conclusion

MaintChain addresses a real, costly problem — industrial maintenance record fraud — with a technically sound solution: multi-party cryptographic approval on Stellar Soroban. The system is live on Testnet with all four smart contracts deployed, a production-grade frontend, and a REST backend.

The project demonstrates that **decentralized compliance is not just technically feasible — it's economically rational**. By making falsification provably expensive and honest work provably verifiable, MaintChain creates alignment between individual incentives and system-wide integrity.

---

*For technical documentation, see [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) and [STELLAR_INTEGRATION.md](./STELLAR_INTEGRATION.md).*
