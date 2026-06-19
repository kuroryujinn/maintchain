#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env};

#[contracttype]
#[derive(Clone, Copy, Eq, PartialEq)]
pub enum MaintenanceStatus {
    Open = 0,
    Submitted = 1,
    PendingApproval = 2,
    Compliant = 3,
    Rejected = 4,
}

#[contracttype]
#[derive(Clone)]
pub struct MaintenanceOrder {
    pub equipment_id: BytesN<32>,
    pub tech_id: Address,
    pub status: MaintenanceStatus,
    pub evidence_hash: Option<BytesN<32>>,
    pub created_at: u64,
}

#[contract]
pub struct MaintenanceRecords;

#[contractimpl]
impl MaintenanceRecords {
    /// Creates a new maintenance record.
    pub fn create_record(
        env: Env,
        maintenance_id: BytesN<32>,
        equipment_id: BytesN<32>,
        tech_id: Address,
    ) {
        if env.storage().instance().has(&maintenance_id) {
            panic!("Maintenance record already exists");
        }

        let order = MaintenanceOrder {
            equipment_id,
            tech_id,
            status: MaintenanceStatus::Open,
            evidence_hash: None,
            created_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&maintenance_id, &order);
    }

    /// Submits evidence for a maintenance record.
    pub fn submit_evidence(env: Env, maintenance_id: BytesN<32>, evidence_hash: BytesN<32>) {
        let mut order: MaintenanceOrder = env.storage().instance().get(&maintenance_id).expect("Maintenance record not found");

        order.evidence_hash = Some(evidence_hash);
        order.status = MaintenanceStatus::Submitted;

        env.storage().instance().set(&maintenance_id, &order);
    }

    /// Updates the status of a maintenance record.
    /// This function should ideally be restricted to authorized callers (e.g., Approval/Attestation contracts).
    pub fn update_status(env: Env, maintenance_id: BytesN<32>, new_status: MaintenanceStatus) {
        let mut order: MaintenanceOrder = env.storage().instance().get(&maintenance_id).expect("Maintenance record not found");

        order.status = new_status;

        env.storage().instance().set(&maintenance_id, &order);
    }

    /// Get maintenance record details.
    pub fn get_record(env: Env, maintenance_id: BytesN<32>) -> MaintenanceOrder {
        env.storage().instance().get(&maintenance_id).expect("Maintenance record not found")
    }
}
