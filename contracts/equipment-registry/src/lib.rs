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

    let out2 = append_str(out, EQUIPMENT_SEP);

    let eq_id_bytes: Bytes = equipment_id.to_bytes();
    let md_bytes: Bytes = metadata_hash.to_bytes();

    let mut out3 = out2;
    out3.append(&eq_id_bytes);
    out3.append(&md_bytes);
    out3.append(&u64_be(env, created_at));
    out3.append(&u32_be(env, version));

    out3
}

fn compute_equipment_hash(
    env: &Env,
    equipment_id: &BytesN<32>,
    owner: &Address,
    metadata_hash: &BytesN<32>,
    created_at: u64,
    version: u32,
) -> BytesN<32> {
    let preimage = canonical_equipment_preimage(
        env,
        equipment_id,
        owner,
        metadata_hash,
        created_at,
        version,
    );
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
        if env.storage().instance().has(&equipment_id) {
            panic!("Equipment already registered");
        }

        let created_at = env.ledger().timestamp();
        let version: u32 = 1;
        let eq_hash =
            compute_equipment_hash(&env, &equipment_id, &owner, &metadata_hash, created_at, version);
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
        let eq_hash = compute_equipment_hash(
            &env,
            &equipment_id_key,
            &new_owner,
            &prev.metadata_hash,
            created_at,
            new_version,
        );

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

#[cfg(test)]
mod tests {
    use super::*;





    fn owner_a(env: &Env) -> Address {
        Address::from_str(env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
    }





    fn owner_b(env: &Env) -> Address {
        Address::from_str(
            env,
            "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
        )
    }




    fn owner_default(env: &Env) -> Address {
        Address::from_str(
            env,
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        )
    }



    #[test]
    fn test_register_equipment_stores_snapshot() {
        let env = Env::default();


        let equipment_id: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);
        let owner: Address = owner_default(&env);
        let metadata_hash: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);

        let eq_hash = EquipmentRegistry::register_equipment(
            env.clone(),
            equipment_id.clone(),
            owner.clone(),
            metadata_hash.clone(),
        );

        let snap = EquipmentRegistry::get_equipment(env.clone(), equipment_id.clone());
        assert_eq!(snap.equipment_id, equipment_id);
        assert_eq!(snap.owner, owner);
        assert_eq!(snap.metadata_hash, metadata_hash);
        assert_eq!(snap.equipment_hash, eq_hash);
        assert_eq!(snap.version, 1);
        assert!(snap.created_at > 0);
    }

    #[test]
    fn test_get_equipment_returns_latest_version() {
        let env = Env::default();

        let equipment_id: BytesN<32> = BytesN::from_array(&env, &[3u8; 32]);
        let owner1: Address = owner_a(&env);
        let owner2: Address = owner_b(&env);
        let metadata_hash: BytesN<32> = BytesN::from_array(&env, &[6u8; 32]);

        let _ = EquipmentRegistry::register_equipment(
            env.clone(),
            equipment_id.clone(),
            owner1.clone(),
            metadata_hash.clone(),
        );
        let _ = EquipmentRegistry::update_owner(env.clone(), equipment_id.clone(), owner2.clone());

        let latest = EquipmentRegistry::get_equipment(env.clone(), equipment_id.clone());
        assert_eq!(latest.owner, owner2);
        assert_eq!(latest.version, 2);
    }

    #[test]
    fn test_update_owner_creates_new_version_snapshot() {
        let env = Env::default();

        let equipment_id: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
        let owner1: Address = owner_a(&env);
        let owner2: Address = owner_b(&env);
        let metadata_hash: BytesN<32> = BytesN::from_array(&env, &[11u8; 32]);

        let h1 = EquipmentRegistry::register_equipment(
            env.clone(),
            equipment_id.clone(),
            owner1.clone(),
            metadata_hash.clone(),
        );
        let h2 = EquipmentRegistry::update_owner(env.clone(), equipment_id.clone(), owner2.clone());
        assert_ne!(h1, h2);

        let v1 = EquipmentRegistry::get_equipment_version(env.clone(), equipment_id.clone(), 1);
        let v2 = EquipmentRegistry::get_equipment_version(env.clone(), equipment_id.clone(), 2);

        assert_eq!(v1.owner, owner1);
        assert_eq!(v1.metadata_hash, metadata_hash);
        assert_eq!(v1.equipment_hash, h1);
        assert_eq!(v1.version, 1);

        assert_eq!(v2.owner, owner2);
        assert_eq!(v2.metadata_hash, metadata_hash);
        assert_eq!(v2.equipment_hash, h2);
        assert_eq!(v2.version, 2);
    }
}

