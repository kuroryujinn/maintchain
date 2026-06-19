#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, BytesN, Env};

const EQUIPMENT_SEP: &str = "EQUP";

#[contracttype]
#[derive(Clone)]
pub struct EquipmentSnapshot {
    pub equipment_id: BytesN<32>,
    pub version: u32,
    pub owner: Address,
    pub metadata_hash: BytesN<32>,
    pub equipment_hash: BytesN<32>,
    pub created_at: u64,
}

#[contract]
pub struct EquipmentRegistry;

fn append_str(out: Bytes, s: &str) -> Bytes {
    // In this SDK version, Bytes::append mutates in-place and returns ()
    let b = Bytes::from_slice(out.env(), s.as_bytes());
    let mut out2 = out;
    out2.append(&b);
    out2
}




fn u32_be(env: &Env, v: u32) -> Bytes {
    let b = [
        ((v >> 24) & 0xFF) as u8,
        ((v >> 16) & 0xFF) as u8,
        ((v >> 8) & 0xFF) as u8,
        (v & 0xFF) as u8,
    ];
    Bytes::from_array(env, &b)
}

fn u64_be(env: &Env, v: u64) -> Bytes {
    let b = [
        ((v >> 56) & 0xFF) as u8,
        ((v >> 48) & 0xFF) as u8,
        ((v >> 40) & 0xFF) as u8,
        ((v >> 32) & 0xFF) as u8,
        ((v >> 24) & 0xFF) as u8,
        ((v >> 16) & 0xFF) as u8,
        ((v >> 8) & 0xFF) as u8,
        (v & 0xFF) as u8,
    ];
    Bytes::from_array(env, &b)
}

fn sha256(env: &Env, preimage: &Bytes) -> BytesN<32> {
    env.crypto().sha256(preimage).into()
}


fn canonical_equipment_preimage(
    env: &Env,
    equipment_id: &BytesN<32>,
    _owner: &Address,
    metadata_hash: &BytesN<32>,
    created_at: u64,
    version: u32,
) -> Bytes {
    // SEP || equipment_id || metadata_hash || created_at || version
    let out = Bytes::new(env);

    let mut out2 = append_str(out, EQUIPMENT_SEP);

    // BytesN<32> supports to_bytes() in this repo version.
    let eq_id_bytes: Bytes = equipment_id.to_bytes();
    out2.append(&eq_id_bytes);

    // owner omitted from preimage (repo soroban-sdk 26.1.0 lacks deterministic Address->Bytes API in this codebase)

    let md_bytes: Bytes = metadata_hash.to_bytes();
    out2.append(&md_bytes);

    out2.append(&u64_be(env, created_at));
    out2.append(&u32_be(env, version));

    out2
}

fn compute_equipment_hash(
    env: &Env,
    equipment_id: &BytesN<32>,
    owner: &Address,
    metadata_hash: &BytesN<32>,
    created_at: u64,
    version: u32,
) -> BytesN<32> {
    // owner currently unused in preimage (SDK lacks deterministic Address->Bytes API here)
    let preimage =
        canonical_equipment_preimage(env, equipment_id, owner, metadata_hash, created_at, version);
    sha256(env, &preimage)
}

#[contractimpl]
impl EquipmentRegistry {
    pub fn register_equipment(
        env: Env,
        equipment_id: BytesN<32>,
        owner: Address,
        metadata_hash: BytesN<32>,
    ) -> BytesN<32> {
        // Latest version pointer existence check
        if env.storage().instance().has(&equipment_id) {
            panic!("Equipment already registered");
        }

        let created_at = env.ledger().timestamp();
        let version: u32 = 1;
        let eq_hash = compute_equipment_hash(&env, &equipment_id, &owner, &metadata_hash, created_at, version);
        let equipment_id_key = equipment_id.clone();

        let snap = EquipmentSnapshot {
            equipment_id: equipment_id_key.clone(),
            version,
            owner,
            metadata_hash,
            equipment_hash: eq_hash.clone(),
            created_at,
        };

        env.storage().instance().set(&equipment_id_key, &version);
        let key = (equipment_id_key, version);
        env.storage().instance().set(&key, &snap);

        eq_hash
    }

    pub fn update_owner(env: Env, equipment_id: BytesN<32>, new_owner: Address) -> BytesN<32> {
        let latest_version: u32 = env
            .storage()
            .instance()
            .get(&equipment_id)
            .expect("Equipment not found");

        let equipment_id_key = equipment_id.clone();
        let prev_key = (equipment_id_key.clone(), latest_version);

        let prev: EquipmentSnapshot = env
            .storage()
            .instance()
            .get(&prev_key)
            .expect("Equipment snapshot missing");

        let new_version = latest_version + 1;
        let created_at = env.ledger().timestamp();
        let eq_hash =
            compute_equipment_hash(&env, &equipment_id_key, &new_owner, &prev.metadata_hash, created_at, new_version);

        let snap = EquipmentSnapshot {
            equipment_id: equipment_id_key.clone(),
            version: new_version,
            owner: new_owner,
            metadata_hash: prev.metadata_hash,
            equipment_hash: eq_hash.clone(),
            created_at,
        };

        env.storage().instance().set(&equipment_id_key, &new_version);
        let key = (equipment_id_key, new_version);
        env.storage().instance().set(&key, &snap);

        eq_hash
    }

    pub fn get_equipment(env: Env, equipment_id: BytesN<32>) -> EquipmentSnapshot {
        let latest_version: u32 = env
            .storage()
            .instance()
            .get(&equipment_id)
            .expect("Equipment not found");
        let key = (equipment_id, latest_version);
        env.storage().instance().get(&key).expect("Equipment snapshot missing")
    }

    pub fn get_equipment_version(env: Env, equipment_id: BytesN<32>, version: u32) -> EquipmentSnapshot {
        let key = (equipment_id, version);
        env.storage().instance().get(&key).expect("Equipment version not found")
    }
}

