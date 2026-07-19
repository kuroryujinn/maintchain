#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, vec, Address, BytesN, Env, IntoVal, Val};

#[contracttype]
#[derive(Clone)]
pub struct Attestation {
    pub issued_at: u64,
    pub issuer: Address,
    pub cert_hash: BytesN<32>,
}

#[contract]
pub struct ComplianceAttestation;

#[contractimpl]
impl ComplianceAttestation {
    /// Issues a final compliance certificate if the maintenance record is eligible.
    pub fn issue_certificate(
        env: Env,
        approval_contract_id: Address,
        records_contract_id: Address,
        maintenance_id: BytesN<32>,
        cert_hash: BytesN<32>,
    ) -> BytesN<32> {
        // 1. Call MultiPartyApproval.verify_compliance to check eligibility.
        // Symbol "verify" (6 chars) matches the exported symbol from multi-party-approval.
        let args: soroban_sdk::Vec<Val> = vec![&env, maintenance_id.clone().into_val(&env)];
        let is_eligible: bool = env.invoke_contract(
            &approval_contract_id,
            &symbol_short!("verify"),
            args,
        );

        if !is_eligible {
            panic!("Maintenance record is not eligible for compliance certification");
        }

        // 2. Issue attestation on-chain
        let attestation = Attestation {
            issued_at: env.ledger().timestamp(),
            issuer: env.current_contract_address(),
            cert_hash: cert_hash.clone(),
        };
        env.storage().instance().set(&maintenance_id, &attestation);

        // 3. Update MaintenanceRecords status to Compliant via cross-contract call.
        // Symbol "complete" (8 chars) matches the exported symbol from maintenance-records.
        let complete_args: soroban_sdk::Vec<Val> = vec![&env, maintenance_id.into_val(&env)];
        env.invoke_contract::<()>(
            &records_contract_id,
            &symbol_short!("complete"),
            complete_args,
        );

        cert_hash
    }

    pub fn get_attestation(env: Env, maintenance_id: BytesN<32>) -> Attestation {
        env.storage().instance().get(&maintenance_id).expect("Attestation not found")
    }
}
