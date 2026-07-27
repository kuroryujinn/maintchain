#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationRecord {
    pub wallet: Address,
    pub role_code: u32,
    pub organization_hash: BytesN<32>,
    pub profile_hash: BytesN<32>,
    pub verified_at: u64,
    pub version: u32,
}

#[contracttype]
pub enum DataKey {
    Verification(Address),
}

#[contract]
pub struct IdentityRegistry;

#[contractimpl]
impl IdentityRegistry {
    /// Verify (or re-verify) a wallet identity.
    /// Requires caller authorization via Freighter.
    /// Overwrites any existing record for the same wallet (re-verify semantics).
    pub fn verify_identity(
        env: Env,
        caller: Address,
        role_code: u32,
        organization_hash: BytesN<32>,
        profile_hash: BytesN<32>,
    ) {
        caller.require_auth();

        // Determine version: increment if re-verifying, otherwise 1
        let next_version: u32 = match env.storage().instance().has(&DataKey::Verification(caller.clone())) {
            true => {
                let existing: VerificationRecord = env.storage()
                    .instance()
                    .get(&DataKey::Verification(caller.clone()))
                    .expect("Verification record not found");
                existing.version + 1
            }
            false => 1,
        };

        let record = VerificationRecord {
            wallet: caller.clone(),
            role_code,
            organization_hash,
            profile_hash,
            verified_at: env.ledger().timestamp(),
            version: next_version,
        };

        env.storage()
            .instance()
            .set(&DataKey::Verification(caller), &record);
    }

    /// Retrieve the verification record for a given wallet.
    /// Panics if no record exists.
    pub fn get_verification(env: Env, wallet: Address) -> VerificationRecord {
        env.storage()
            .instance()
            .get(&DataKey::Verification(wallet))
            .expect("verification record not found")
    }

    /// Lightweight check: whether a wallet has been verified at least once.
    pub fn is_verified(env: Env, wallet: Address) -> bool {
        env.storage().instance().has(&DataKey::Verification(wallet))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::testutils::Ledger as _;

    fn sample_hash(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
    }

    #[test]
    fn test_verify_identity_stores_record() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(IdentityRegistry, ());
        env.ledger().set_timestamp(5000);
        let client = IdentityRegistryClient::new(&env, &contract_id);
        let caller = Address::generate(&env);

        client.verify_identity(&caller, &1u32, &sample_hash(&env, 2), &sample_hash(&env, 3));

        let record = client.get_verification(&caller);
        assert_eq!(record.role_code, 1u32);
        assert_eq!(record.wallet, caller);
        assert_eq!(record.version, 1);
        assert_eq!(record.verified_at, 5000);
    }

    #[test]
    fn test_is_verified_false_before_write() {
        let env = Env::default();
        let contract_id = env.register(IdentityRegistry, ());
        let client = IdentityRegistryClient::new(&env, &contract_id);
        let caller = Address::generate(&env);

        assert_eq!(client.is_verified(&caller), false);
    }

    #[test]
    fn test_reverification_increments_version() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(IdentityRegistry, ());
        env.ledger().set_timestamp(5000);
        let client = IdentityRegistryClient::new(&env, &contract_id);
        let caller = Address::generate(&env);

        // First verification
        client.verify_identity(&caller, &1u32, &sample_hash(&env, 2), &sample_hash(&env, 3));
        let r1 = client.get_verification(&caller);
        assert_eq!(r1.version, 1);

        // Re-verify with different role
        env.ledger().set_timestamp(6000);
        client.verify_identity(&caller, &2u32, &sample_hash(&env, 4), &sample_hash(&env, 5));
        let r2 = client.get_verification(&caller);
        assert_eq!(r2.version, 2);
        assert_eq!(r2.role_code, 2u32);
        assert_eq!(r2.verified_at, 6000);
    }

    #[test]
    fn test_reverification_preserves_previous_data_fields() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(IdentityRegistry, ());
        let client = IdentityRegistryClient::new(&env, &contract_id);
        let caller = Address::generate(&env);

        let org_hash1 = sample_hash(&env, 10);
        let prof_hash1 = sample_hash(&env, 20);
        client.verify_identity(&caller, &3u32, &org_hash1, &prof_hash1);

        let org_hash2 = sample_hash(&env, 30);
        let prof_hash2 = sample_hash(&env, 40);
        client.verify_identity(&caller, &5u32, &org_hash2, &prof_hash2);

        let record = client.get_verification(&caller);
        // After re-verification, all fields should reflect the latest values
        assert_eq!(record.role_code, 5u32);
        assert_eq!(record.organization_hash, org_hash2);
        assert_eq!(record.profile_hash, prof_hash2);
        assert_eq!(record.version, 2);
    }

    #[test]
    fn test_is_verified_returns_true_after_verification() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(IdentityRegistry, ());
        let client = IdentityRegistryClient::new(&env, &contract_id);
        let caller = Address::generate(&env);

        assert_eq!(client.is_verified(&caller), false);
        client.verify_identity(&caller, &1u32, &sample_hash(&env, 2), &sample_hash(&env, 3));
        assert_eq!(client.is_verified(&caller), true);
    }

    #[test]
    fn test_different_wallets_independent() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(IdentityRegistry, ());
        let client = IdentityRegistryClient::new(&env, &contract_id);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.verify_identity(&alice, &1u32, &sample_hash(&env, 2), &sample_hash(&env, 3));
        assert!(client.is_verified(&alice));
        assert!(!client.is_verified(&bob));
    }
}
