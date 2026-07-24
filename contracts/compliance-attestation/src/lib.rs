#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, symbol_short, vec, Address, BytesN, Env, IntoVal, Val};

// ─── Event Types ─────────────────────────────────────────

#[contractevent]
#[derive(Clone)]
pub struct CertifyEvent {
    #[topic]
    pub maintenance_id: BytesN<32>,
    pub cert_hash: BytesN<32>,
}

// ─── Storage Types ────────────────────────────────────────

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
        // 1. Call MultiPartyApproval.verify to check eligibility.
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
        let attestation_addr: Address = env.current_contract_address();

        let complete_args: soroban_sdk::Vec<Val> = vec![
            &env,
            maintenance_id.clone().into_val(&env),
            attestation_addr.into_val(&env),
        ];
        env.invoke_contract::<()>(
            &records_contract_id,
            &symbol_short!("complete"),
            complete_args,
        );

        // 4. Emit certification event
        CertifyEvent {
            maintenance_id: maintenance_id.clone(),
            cert_hash: cert_hash.clone(),
        }.publish(&env);

        cert_hash
    }

    pub fn get_attestation(env: Env, maintenance_id: BytesN<32>) -> Attestation {
        env.storage().instance().get(&maintenance_id)
            .expect("Attestation not found")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::testutils::Ledger as _;

    fn approved_decision(env: &Env) -> BytesN<32> {
        let mut bytes = [0u8; 32];
        bytes[0] = 0x01;
        BytesN::from_array(env, &bytes)
    }

    fn setup_full_environment() -> (Env, Address, Address, Address, BytesN<32>) {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1000);

        let attestation_id = env.register(ComplianceAttestation, ());
        let approval_id = env.register(multi_party_approval::MultiPartyApproval, ());
        let records_id = env.register(maintenance_records::MaintenanceRecords, ());

        let tech: Address = Address::generate(&env);
        let supervisor: Address = Address::generate(&env);
        let maintenance_id: BytesN<32> = BytesN::from_array(&env, &[0x01u8; 32]);
        let equipment_id: BytesN<32> = BytesN::from_array(&env, &[0x02u8; 32]);

        let records_client = maintenance_records::MaintenanceRecordsClient::new(&env, &records_id);
        records_client.create_record(&maintenance_id, &equipment_id, &tech);

        let evidence_hash: BytesN<32> = BytesN::from_array(&env, &[0xEEu8; 32]);
        records_client.submit_evidence(&maintenance_id, &evidence_hash, &tech);

        let approval_client = multi_party_approval::MultiPartyApprovalClient::new(&env, &approval_id);
        approval_client.approve_by_technician(&maintenance_id, &tech);
        let decision = approved_decision(&env);
        approval_client.approve_by_supervisor(&maintenance_id, &decision, &supervisor);

        records_client.set_authorized_completer(&attestation_id, &attestation_id);
        records_client.update_status(&maintenance_id, &maintenance_records::MaintenanceStatus::PendingApproval);

        (env, attestation_id, approval_id, records_id, maintenance_id)
    }

    #[test]
    fn test_full_certification_flow() {
        let (env, attestation_id, approval_id, records_id, maintenance_id) =
            setup_full_environment();

        let cert_hash: BytesN<32> = BytesN::from_array(&env, &[0xABu8; 32]);

        let client = ComplianceAttestationClient::new(&env, &attestation_id);
        let result = client.issue_certificate(
            &approval_id, &records_id, &maintenance_id, &cert_hash,
        );

        assert_eq!(result, cert_hash);

        let attestation = client.get_attestation(&maintenance_id);
        assert_eq!(attestation.issued_at, 1000);
        assert_eq!(attestation.issuer, attestation_id);
        assert_eq!(attestation.cert_hash, cert_hash);

        let records_client = maintenance_records::MaintenanceRecordsClient::new(&env, &records_id);
        let record = records_client.get_record(&maintenance_id);
        assert_eq!(record.status, maintenance_records::MaintenanceStatus::Compliant);
    }

    #[test]
    fn test_certification_fails_when_not_eligible() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1000);

        let attestation_id = env.register(ComplianceAttestation, ());
        let approval_id = env.register(multi_party_approval::MultiPartyApproval, ());
        let records_id = env.register(maintenance_records::MaintenanceRecords, ());

        let maintenance_id: BytesN<32> = BytesN::from_array(&env, &[0x01u8; 32]);
        let equipment_id: BytesN<32> = BytesN::from_array(&env, &[0x02u8; 32]);
        let tech: Address = Address::generate(&env);
        let cert_hash: BytesN<32> = BytesN::from_array(&env, &[0xABu8; 32]);

        let records_client = maintenance_records::MaintenanceRecordsClient::new(&env, &records_id);
        records_client.create_record(&maintenance_id, &equipment_id, &tech);
        records_client.set_authorized_completer(&attestation_id, &attestation_id);

        let client = ComplianceAttestationClient::new(&env, &attestation_id);
        let result = client.try_issue_certificate(
            &approval_id, &records_id, &maintenance_id, &cert_hash,
        );

        assert!(result.is_err(), "Expected error when not eligible");
    }

    #[test]
    fn test_certification_fails_for_ineligible_status() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1000);

        let attestation_id = env.register(ComplianceAttestation, ());
        let approval_id = env.register(multi_party_approval::MultiPartyApproval, ());
        let records_id = env.register(maintenance_records::MaintenanceRecords, ());

        let maintenance_id: BytesN<32> = BytesN::from_array(&env, &[0x01u8; 32]);
        let equipment_id: BytesN<32> = BytesN::from_array(&env, &[0x02u8; 32]);
        let tech: Address = Address::generate(&env);
        let supervisor: Address = Address::generate(&env);
        let cert_hash: BytesN<32> = BytesN::from_array(&env, &[0xABu8; 32]);

        let records_client = maintenance_records::MaintenanceRecordsClient::new(&env, &records_id);
        records_client.create_record(&maintenance_id, &equipment_id, &tech);

        let approval_client = multi_party_approval::MultiPartyApprovalClient::new(&env, &approval_id);
        approval_client.approve_by_technician(&maintenance_id, &tech);
        let decision = approved_decision(&env);
        approval_client.approve_by_supervisor(&maintenance_id, &decision, &supervisor);

        records_client.set_authorized_completer(&attestation_id, &attestation_id);

        let client = ComplianceAttestationClient::new(&env, &attestation_id);
        let result = client.try_issue_certificate(
            &approval_id, &records_id, &maintenance_id, &cert_hash,
        );

        assert!(result.is_err(), "Expected error when record not PendingApproval");
    }

    #[test]
    fn test_get_attestation_not_found() {
        let env = Env::default();
        env.mock_all_auths();

        let attestation_id = env.register(ComplianceAttestation, ());
        let missing_id: BytesN<32> = BytesN::from_array(&env, &[0xFFu8; 32]);

        let client = ComplianceAttestationClient::new(&env, &attestation_id);
        let result = client.try_get_attestation(&missing_id);

        assert!(result.is_err(), "Expected error for missing attestation");
    }
}
