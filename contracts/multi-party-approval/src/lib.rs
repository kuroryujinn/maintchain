#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, BytesN, Env};

// ─── Event Types ─────────────────────────────────────────

#[contractevent]
#[derive(Clone)]
pub struct ApproveEvent {
    #[topic]
    pub maintenance_id: BytesN<32>,
    pub approved: bool,
}

#[contractevent]
#[derive(Clone)]
pub struct RejectEvent {
    #[topic]
    pub maintenance_id: BytesN<32>,
}

#[contractevent]
#[derive(Clone)]
pub struct AuditEvent {
    #[topic]
    pub maintenance_id: BytesN<32>,
    pub approved: bool,
}

// ─── Storage Types ────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct ApprovalState {
    pub tech_approved: bool,
    pub supervisor_approved: bool,
    pub auditor_approved: bool,
    pub auditor_required: bool,
    pub technician: Option<Address>,
    pub supervisor: Option<Address>,
    pub auditor: Option<Address>,
}

#[contract]
pub struct MultiPartyApproval;

#[contractimpl]
impl MultiPartyApproval {
    pub fn set_auditor_required(env: Env, maintenance_id: BytesN<32>, required: bool, caller: Address) {
        caller.require_auth();

        let mut state: ApprovalState = env.storage().instance().get(&maintenance_id).unwrap_or(ApprovalState {
            tech_approved: false,
            supervisor_approved: false,
            auditor_approved: false,
            auditor_required: false,
            technician: None,
            supervisor: None,
            auditor: None,
        });

        if let Some(ref tech) = state.technician {
            if caller != *tech {
                panic!("Only the assigned technician can set auditor requirement");
            }
        } else {
            state.technician = Some(caller.clone());
        }

        state.auditor_required = required;
        env.storage().instance().set(&maintenance_id, &state);
    }

    pub fn approve_by_technician(env: Env, maintenance_id: BytesN<32>, caller: Address) {
        caller.require_auth();

        let mut state: ApprovalState = env.storage().instance().get(&maintenance_id).unwrap_or(ApprovalState {
            tech_approved: false,
            supervisor_approved: false,
            auditor_approved: false,
            auditor_required: false,
            technician: None,
            supervisor: None,
            auditor: None,
        });

        if let Some(ref tech) = state.technician {
            if caller != *tech {
                panic!("Only the assigned technician can approve");
            }
        } else {
            state.technician = Some(caller.clone());
        }

        state.tech_approved = true;
        env.storage().instance().set(&maintenance_id, &state);
    }

    pub fn approve_by_supervisor(env: Env, maintenance_id: BytesN<32>, decision: BytesN<32>, caller: Address) {
        caller.require_auth();

        let mut state: ApprovalState = env.storage().instance().get(&maintenance_id).unwrap_or(ApprovalState {
            tech_approved: false,
            supervisor_approved: false,
            auditor_approved: false,
            auditor_required: false,
            technician: None,
            supervisor: None,
            auditor: None,
        });

        if let Some(ref sup) = state.supervisor {
            if caller != *sup {
                panic!("Only the assigned supervisor can approve");
            }
        } else {
            state.supervisor = Some(caller.clone());
        }

        let first_opt = decision.as_ref().get(0);
        let first = match first_opt {
            Some(v) => v,
            None => 0,
        };

        let approved = first == 1;
        state.supervisor_approved = approved;
        env.storage().instance().set(&maintenance_id, &state);

        ApproveEvent {
            maintenance_id: maintenance_id.clone(),
            approved,
        }.publish(&env);
    }

    pub fn reject_by_supervisor(env: Env, maintenance_id: BytesN<32>, caller: Address) {
        caller.require_auth();

        let mut state: ApprovalState = env.storage().instance().get(&maintenance_id).unwrap_or(ApprovalState {
            tech_approved: false,
            supervisor_approved: false,
            auditor_approved: false,
            auditor_required: false,
            technician: None,
            supervisor: None,
            auditor: None,
        });

        if let Some(ref sup) = state.supervisor {
            if caller != *sup {
                panic!("Only the assigned supervisor can reject");
            }
        } else {
            state.supervisor = Some(caller.clone());
        }

        state.supervisor_approved = false;
        env.storage().instance().set(&maintenance_id, &state);

        RejectEvent {
            maintenance_id,
        }.publish(&env);
    }

    pub fn approve_by_auditor(env: Env, maintenance_id: BytesN<32>, caller: Address) {
        caller.require_auth();

        let mut state: ApprovalState = env.storage().instance().get(&maintenance_id).unwrap_or(ApprovalState {
            tech_approved: false,
            supervisor_approved: false,
            auditor_approved: false,
            auditor_required: false,
            technician: None,
            supervisor: None,
            auditor: None,
        });

        if let Some(ref aud) = state.auditor {
            if caller != *aud {
                panic!("Only the assigned auditor can approve");
            }
        } else {
            state.auditor = Some(caller.clone());
        }

        state.auditor_approved = true;
        env.storage().instance().set(&maintenance_id, &state);

        AuditEvent {
            maintenance_id,
            approved: true,
        }.publish(&env);
    }

    pub fn verify(env: Env, maintenance_id: BytesN<32>) -> bool {
        let state: ApprovalState = env.storage().instance().get(&maintenance_id).expect("Approval state not found");

        let tech_ok = state.tech_approved;
        let supervisor_ok = state.supervisor_approved;
        let auditor_ok = if state.auditor_required {
            state.auditor_approved
        } else {
            true
        };

        tech_ok && supervisor_ok && auditor_ok
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn generate_maintenance_id(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
    }

    fn approve_decision(env: &Env) -> BytesN<32> {
        let mut bytes = [0u8; 32];
        bytes[0] = 1;
        BytesN::from_array(env, &bytes)
    }

    fn reject_decision(env: &Env) -> BytesN<32> {
        let mut bytes = [0u8; 32];
        bytes[0] = 0;
        BytesN::from_array(env, &bytes)
    }

    fn setup_client(env: &Env) -> (MultiPartyApprovalClient, BytesN<32>, Address, Address, Address) {
        let contract_id = env.register(MultiPartyApproval, ());
        let client = MultiPartyApprovalClient::new(env, &contract_id);
        let maintenance_id = generate_maintenance_id(env, 1);
        let tech = Address::generate(env);
        let supervisor = Address::generate(env);
        let auditor = Address::generate(env);
        (client, maintenance_id, tech, supervisor, auditor)
    }

    // ── approve_by_technician ──

    #[test]
    fn test_technician_approval_sets_tech_approved() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, _supervisor, _auditor) = setup_client(&env);

        client.approve_by_technician(&maintenance_id, &tech);
        // verify should fail because supervisor hasn't approved yet
        assert!(!client.verify(&maintenance_id));
    }

    #[test]
    fn test_technician_approval_assigns_technician_and_allows_reapproval() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, _supervisor, _auditor) = setup_client(&env);

        // First call assigns the technician
        client.approve_by_technician(&maintenance_id, &tech);
        // Second call with same address should succeed (idempotent)
        client.approve_by_technician(&maintenance_id, &tech);

        assert!(!client.verify(&maintenance_id));
    }

    #[test]
    fn test_technician_approval_panics_for_wrong_caller() {
        let env = Env::default();
        let (client, maintenance_id, tech, _supervisor, _auditor) = setup_client(&env);
        let wrong = Address::generate(&env);

        // First call assigns tech
        env.mock_all_auths();
        client.approve_by_technician(&maintenance_id, &tech);

        // Second call with different address should panic
        env.mock_all_auths();
        let result = client.try_approve_by_technician(&maintenance_id, &wrong);
        assert!(result.is_err());
    }

    // ── approve_by_supervisor ──

    #[test]
    fn test_supervisor_approval_makes_verify_pass_with_tech() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, supervisor, _auditor) = setup_client(&env);

        client.approve_by_technician(&maintenance_id, &tech);
        client.approve_by_supervisor(&maintenance_id, &approve_decision(&env), &supervisor);

        // Both tech and supervisor approved, auditor not required -> verify true
        assert!(client.verify(&maintenance_id));
    }

    #[test]
    fn test_supervisor_approval_with_reject_decision_keeps_verify_false() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, supervisor, _auditor) = setup_client(&env);

        client.approve_by_technician(&maintenance_id, &tech);
        // Supervisor sends a reject decision (first byte = 0)
        client.approve_by_supervisor(&maintenance_id, &reject_decision(&env), &supervisor);

        assert!(!client.verify(&maintenance_id));
    }

    #[test]
    fn test_supervisor_approval_panics_for_wrong_caller() {
        let env = Env::default();
        let (client, maintenance_id, _tech, supervisor, _auditor) = setup_client(&env);
        let wrong = Address::generate(&env);

        env.mock_all_auths();
        client.approve_by_supervisor(&maintenance_id, &approve_decision(&env), &supervisor);

        env.mock_all_auths();
        let result = client.try_approve_by_supervisor(&maintenance_id, &approve_decision(&env), &wrong);
        assert!(result.is_err());
    }

    // ── reject_by_supervisor ──

    #[test]
    fn test_reject_by_supervisor_overrides_approval() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, supervisor, _auditor) = setup_client(&env);

        client.approve_by_technician(&maintenance_id, &tech);
        client.approve_by_supervisor(&maintenance_id, &approve_decision(&env), &supervisor);
        assert!(client.verify(&maintenance_id));

        // Now reject
        client.reject_by_supervisor(&maintenance_id, &supervisor);
        assert!(!client.verify(&maintenance_id));
    }

    #[test]
    fn test_reject_by_supervisor_panics_for_wrong_caller() {
        let env = Env::default();
        let (client, maintenance_id, _tech, supervisor, _auditor) = setup_client(&env);
        let wrong = Address::generate(&env);

        env.mock_all_auths();
        client.approve_by_supervisor(&maintenance_id, &approve_decision(&env), &supervisor);

        env.mock_all_auths();
        let result = client.try_reject_by_supervisor(&maintenance_id, &wrong);
        assert!(result.is_err());
    }

    // ── approve_by_auditor ──

    #[test]
    fn test_auditor_approval_needed_when_required() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, supervisor, auditor) = setup_client(&env);

        client.set_auditor_required(&maintenance_id, &true, &tech);
        client.approve_by_technician(&maintenance_id, &tech);
        client.approve_by_supervisor(&maintenance_id, &approve_decision(&env), &supervisor);

        // Auditor required but not yet approved -> verify fails
        assert!(!client.verify(&maintenance_id));

        // Now approve auditor
        client.approve_by_auditor(&maintenance_id, &auditor);
        assert!(client.verify(&maintenance_id));
    }

    #[test]
    fn test_auditor_not_needed_by_default() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, supervisor, _auditor) = setup_client(&env);

        client.approve_by_technician(&maintenance_id, &tech);
        client.approve_by_supervisor(&maintenance_id, &approve_decision(&env), &supervisor);

        // Auditor not required by default -> verify passes with just tech + supervisor
        assert!(client.verify(&maintenance_id));
    }

    #[test]
    fn test_auditor_approval_panics_for_wrong_caller() {
        let env = Env::default();
        let (client, maintenance_id, _tech, _supervisor, auditor) = setup_client(&env);
        let wrong = Address::generate(&env);

        env.mock_all_auths();
        client.approve_by_auditor(&maintenance_id, &auditor);

        env.mock_all_auths();
        let result = client.try_approve_by_auditor(&maintenance_id, &wrong);
        assert!(result.is_err());
    }

    // ── verify ──

    #[test]
    fn test_verify_panics_when_no_state_exists() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(MultiPartyApproval, ());
        let client = MultiPartyApprovalClient::new(&env, &contract_id);
        let unknown_id = generate_maintenance_id(&env, 99);

        let result = client.try_verify(&unknown_id);
        assert!(result.is_err());
    }

    #[test]
    fn test_verify_returns_false_with_only_technician() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, _supervisor, _auditor) = setup_client(&env);

        client.approve_by_technician(&maintenance_id, &tech);
        assert!(!client.verify(&maintenance_id));
    }

    #[test]
    fn test_verify_returns_false_with_only_supervisor() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, _tech, supervisor, _auditor) = setup_client(&env);

        client.approve_by_supervisor(&maintenance_id, &approve_decision(&env), &supervisor);
        assert!(!client.verify(&maintenance_id));
    }

    #[test]
    fn test_verify_returns_false_when_supervisor_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, supervisor, _auditor) = setup_client(&env);

        client.approve_by_technician(&maintenance_id, &tech);
        client.approve_by_supervisor(&maintenance_id, &reject_decision(&env), &supervisor);
        assert!(!client.verify(&maintenance_id));
    }

    // ── set_auditor_required ──

    #[test]
    fn test_set_auditor_required_only_by_technician() {
        let env = Env::default();
        let (client, maintenance_id, tech, _supervisor, _auditor) = setup_client(&env);

        env.mock_all_auths();
        client.set_auditor_required(&maintenance_id, &true, &tech);

        env.mock_all_auths();
        let wrong = Address::generate(&env);
        let result = client.try_set_auditor_required(&maintenance_id, &false, &wrong);
        assert!(result.is_err());
    }

    #[test]
    fn test_set_auditor_required_then_verify_without_auditor_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, supervisor, _auditor) = setup_client(&env);

        client.set_auditor_required(&maintenance_id, &true, &tech);
        client.approve_by_technician(&maintenance_id, &tech);
        client.approve_by_supervisor(&maintenance_id, &approve_decision(&env), &supervisor);

        // Auditor required but not approved -> verify fails
        assert!(!client.verify(&maintenance_id));
    }

    // ── Full Flow ──

    #[test]
    fn test_full_approval_flow_with_auditor() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, maintenance_id, tech, supervisor, auditor) = setup_client(&env);

        // Step 1: Tech approves
        client.approve_by_technician(&maintenance_id, &tech);
        assert!(!client.verify(&maintenance_id)); // missing supervisor

        // Step 2: Supervisor approves
        client.approve_by_supervisor(&maintenance_id, &approve_decision(&env), &supervisor);
        assert!(client.verify(&maintenance_id)); // auditor not required, so OK

        // Step 3: Set auditor required
        client.set_auditor_required(&maintenance_id, &true, &tech);
        assert!(!client.verify(&maintenance_id)); // now auditor is needed

        // Step 4: Auditor approves
        client.approve_by_auditor(&maintenance_id, &auditor);
        assert!(client.verify(&maintenance_id)); // all approvals met

        // Step 5: Supervisor rejects
        client.reject_by_supervisor(&maintenance_id, &supervisor);
        assert!(!client.verify(&maintenance_id)); // rejected
    }
}

