#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, BytesN, Env};

#[contracttype]
#[derive(Clone)]
pub struct ApprovalState {
    pub tech_approved: bool,
    pub supervisor_approved: bool,
    pub auditor_approved: bool,
    pub auditor_required: bool,
}

#[contract]
pub struct MultiPartyApproval;

#[contractimpl]
impl MultiPartyApproval {
    /// Configure whether an auditor is required for a specific maintenance record.
    pub fn set_auditor_required(env: Env, maintenance_id: BytesN<32>, required: bool) {
        let mut state: ApprovalState = env.storage().instance().get(&maintenance_id).unwrap_or(ApprovalState {
            tech_approved: false,
            supervisor_approved: false,
            auditor_approved: false,
            auditor_required: false,
        });

        state.auditor_required = required;
        env.storage().instance().set(&maintenance_id, &state);
    }

    /// Technician approval.
    pub fn approve_by_technician(env: Env, maintenance_id: BytesN<32>) {
        let mut state: ApprovalState = env.storage().instance().get(&maintenance_id).unwrap_or(ApprovalState {
            tech_approved: false,
            supervisor_approved: false,
            auditor_approved: false,
            auditor_required: false,
        });

        state.tech_approved = true;
        env.storage().instance().set(&maintenance_id, &state);
    }

    /// Supervisor approval.
    /// The decision is passed as BytesN<32>. We expect the first byte to be 1 for APPROVED and 0 for REJECTED.
    pub fn approve_by_supervisor(env: Env, maintenance_id: BytesN<32>, decision: BytesN<32>) {
        let mut state: ApprovalState = env.storage().instance().get(&maintenance_id).unwrap_or(ApprovalState {
            tech_approved: false,
            supervisor_approved: false,
            auditor_approved: false,
            auditor_required: false,
        });

        // Simulating check for "APPROVED" via first byte.
        let first_opt = decision.as_ref().get(0);
        let first = match first_opt {
            Some(v) => v,
            None => 0,
        };

        state.supervisor_approved = first == 1;

        env.storage().instance().set(&maintenance_id, &state);

        // Emit approval event
        env.events().publish((
            symbol_short!("approve"),
            maintenance_id.clone(),
        ), first == 1);
    }

    /// Supervisor rejection.
    pub fn reject_by_supervisor(env: Env, maintenance_id: BytesN<32>) {
        let mut state: ApprovalState = env.storage().instance().get(&maintenance_id).unwrap_or(ApprovalState {
            tech_approved: false,
            supervisor_approved: false,
            auditor_approved: false,
            auditor_required: false,
        });

        state.supervisor_approved = false;
        env.storage().instance().set(&maintenance_id, &state);

        // Emit rejection event
        env.events().publish((
            symbol_short!("reject"),
            maintenance_id.clone(),
        ), false);
    }

    /// Auditor approval.
    pub fn approve_by_auditor(env: Env, maintenance_id: BytesN<32>) {
        let mut state: ApprovalState = env.storage().instance().get(&maintenance_id).unwrap_or(ApprovalState {
            tech_approved: false,
            supervisor_approved: false,
            auditor_approved: false,
            auditor_required: false,
        });

        state.auditor_approved = true;
        env.storage().instance().set(&maintenance_id, &state);

        // Emit auditor approval event
        env.events().publish((
            symbol_short!("audit"),
            maintenance_id.clone(),
        ), true);
    }

    /// Compliance verification.
    /// Returns true if the record is eligible for final certification.
    pub fn verify_compliance(env: Env, maintenance_id: BytesN<32>) -> bool {
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
