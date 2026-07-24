#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, BytesN, Env};

// ─── Event Types ─────────────────────────────────────────

#[contractevent]
#[derive(Clone)]
pub struct EvidenceEvent {
    #[topic]
    pub maintenance_id: BytesN<32>,
    pub evidence_hash: BytesN<32>,
}

#[contractevent]
#[derive(Clone)]
pub struct StatusEvent {
    #[topic]
    pub maintenance_id: BytesN<32>,
    pub new_status: u32,
}

#[contractevent]
#[derive(Clone)]
pub struct CompleteEvent {
    #[topic]
    pub maintenance_id: BytesN<32>,
    pub status: u32,
}

// ─── Storage Types ────────────────────────────────────────

#[contracttype]
#[derive(Clone, Copy, Eq, PartialEq, Debug)]
pub enum MaintenanceStatus {
    Open = 0,
    Submitted = 1,
    PendingApproval = 2,
    Compliant = 3,
    Rejected = 4,
    PendingAudit = 5,
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

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    AuthorizedCompleter,
}

#[contract]
pub struct MaintenanceRecords;

#[contractimpl]
impl MaintenanceRecords {
    /// Creates a new maintenance record.
    /// The tech_id address must authorize this call.
    pub fn create_record(
        env: Env,
        maintenance_id: BytesN<32>,
        equipment_id: BytesN<32>,
        tech_id: Address,
    ) {
        tech_id.require_auth();

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
    /// The caller address must match the record's technician and must authorize.
    pub fn submit_evidence(env: Env, maintenance_id: BytesN<32>, evidence_hash: BytesN<32>, caller: Address) {
        caller.require_auth();

        let mut order: MaintenanceOrder = env.storage().instance().get(&maintenance_id)
            .expect("Maintenance record not found");

        if caller != order.tech_id {
            panic!("Only the assigned technician can submit evidence");
        }

        order.evidence_hash = Some(evidence_hash.clone());
        order.status = MaintenanceStatus::Submitted;

        env.storage().instance().set(&maintenance_id, &order);

        EvidenceEvent {
            maintenance_id: maintenance_id.clone(),
            evidence_hash,
        }.publish(&env);
    }

    /// Updates the status of a maintenance record.
    /// Any contract can call this via cross-contract invocation.
    pub fn update_status(env: Env, maintenance_id: BytesN<32>, new_status: MaintenanceStatus) {
        let mut order: MaintenanceOrder = env.storage().instance().get(&maintenance_id)
            .expect("Maintenance record not found");

        order.status = new_status;
        env.storage().instance().set(&maintenance_id, &order);

        StatusEvent {
            maintenance_id: maintenance_id.clone(),
            new_status: new_status as u32,
        }.publish(&env);
    }

    /// Set the authorized completer contract address.
    pub fn set_authorized_completer(env: Env, authorized_address: Address, caller: Address) {
        caller.require_auth();

        if let Some(existing) = env.storage().instance().get::<_, Address>(&DataKey::AuthorizedCompleter) {
            if caller != existing {
                panic!("Only the current authorized completer can update this setting");
            }
        }

        env.storage().instance().set(&DataKey::AuthorizedCompleter, &authorized_address);
    }

    /// Complete a maintenance record (transition to Compliant).
    /// Named `complete` for cross-contract call compatibility.
    pub fn complete(env: Env, maintenance_id: BytesN<32>, attestation_contract: Address) {
        attestation_contract.require_auth();

        let authorized: Address = env.storage().instance()
            .get(&DataKey::AuthorizedCompleter)
            .expect("Authorized completer not configured");

        if attestation_contract != authorized {
            panic!("Only the authorized compliance attestation contract can complete records");
        }

        let mut order: MaintenanceOrder = env.storage().instance().get(&maintenance_id)
            .expect("Maintenance record not found");

        if order.status != MaintenanceStatus::PendingApproval {
            panic!("Must be PendingApproval to complete");
        }

        order.status = MaintenanceStatus::Compliant;
        env.storage().instance().set(&maintenance_id, &order);

        CompleteEvent {
            maintenance_id,
            status: MaintenanceStatus::Compliant as u32,
        }.publish(&env);
    }

    pub fn get_record(env: Env, maintenance_id: BytesN<32>) -> MaintenanceOrder {
        env.storage().instance().get(&maintenance_id)
            .expect("Maintenance record not found")
    }

    pub fn get_authorized_completer(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::AuthorizedCompleter)
    }
}
