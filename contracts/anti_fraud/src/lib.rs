#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    CampaignNotFound = 4,
    InvalidAmount = 5,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Initialized,
    Campaign(u64),
    Score(u64),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CampaignDeposit {
    pub advertiser: Address,
    pub deposit: i128,
    pub slashed: i128,
    pub fraud_reports: u32,
}

const SEVERITY_WEIGHT: u32 = 25;
const SLASH_THRESHOLD: u32 = 50;

#[contract]
pub struct AntiFraud;

#[contractimpl]
impl AntiFraud {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().extend_ttl(100, 518400);
        Ok(())
    }

    pub fn register_campaign(
        env: Env,
        campaign_id: u64,
        advertiser: Address,
        deposit: i128,
    ) -> Result<(), Error> {
        Self::require_init(&env)?;
        if deposit <= 0 {
            return Err(Error::InvalidAmount);
        }
        let record = CampaignDeposit {
            advertiser,
            deposit,
            slashed: 0,
            fraud_reports: 0,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &record);
        env.storage()
            .persistent()
            .set(&DataKey::Score(campaign_id), &0u32);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Campaign(campaign_id), 100, 518400);
        Ok(())
    }

    /// Anyone can report; severity 1–4 increases fraud score.
    pub fn report_fraud(
        env: Env,
        reporter: Address,
        campaign_id: u64,
        severity: u32,
    ) -> Result<u32, Error> {
        reporter.require_auth();
        Self::require_init(&env)?;
        let mut record: CampaignDeposit = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)?;

        let sev = if severity == 0 {
            1
        } else if severity > 4 {
            4
        } else {
            severity
        };
        record.fraud_reports = record.fraud_reports.saturating_add(1);
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &record);

        let mut score: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::Score(campaign_id))
            .unwrap_or(0);
        score = score.saturating_add(sev.saturating_mul(SEVERITY_WEIGHT));
        env.storage()
            .persistent()
            .set(&DataKey::Score(campaign_id), &score);

        env.events().publish(
            (symbol_short!("fraud_rpt"), campaign_id),
            (reporter, severity, score),
        );
        Ok(score)
    }

    /// Returns true if batch is clean. If score >= threshold, slashes 10% of remaining deposit.
    pub fn verify_batch(env: Env, campaign_id: u64, view_count: u32) -> Result<bool, Error> {
        Self::require_init(&env)?;
        let score: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::Score(campaign_id))
            .unwrap_or(0);

        if score >= SLASH_THRESHOLD {
            let slash_ok = Self::slash_internal(&env, campaign_id, view_count)?;
            env.events().publish(
                (symbol_short!("fraud_sl"), campaign_id),
                (score, view_count, slash_ok),
            );
            return Ok(false);
        }

        // Heuristic: absurdly high view bursts bump score but still allow once.
        if view_count > 10_000 {
            let s = score.saturating_add(20);
            env.storage()
                .persistent()
                .set(&DataKey::Score(campaign_id), &s);
        }

        Ok(true)
    }

    pub fn slash(env: Env, campaign_id: u64, amount: i128) -> Result<i128, Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        Self::slash_amount(&env, campaign_id, amount)
    }

    pub fn get_score(env: Env, campaign_id: u64) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Score(campaign_id))
            .unwrap_or(0)
    }

    pub fn get_deposit(env: Env, campaign_id: u64) -> Option<CampaignDeposit> {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
    }

    fn require_init(env: &Env) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            Ok(())
        } else {
            Err(Error::NotInitialized)
        }
    }

    fn slash_internal(env: &Env, campaign_id: u64, _view_count: u32) -> Result<i128, Error> {
        let record: CampaignDeposit = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)?;
        let remaining = record.deposit.saturating_sub(record.slashed);
        let amount = remaining / 10; // 10% slash
        if amount <= 0 {
            return Ok(0);
        }
        Self::slash_amount(env, campaign_id, amount)
    }

    fn slash_amount(env: &Env, campaign_id: u64, amount: i128) -> Result<i128, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let mut record: CampaignDeposit = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)?;
        let remaining = record.deposit.saturating_sub(record.slashed);
        let applied = if amount > remaining { remaining } else { amount };
        record.slashed = record.slashed.saturating_add(applied);
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &record);
        Ok(applied)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, Address, AntiFraudClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(AntiFraud, ());
        let client = AntiFraudClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, admin, client)
    }

    #[test]
    fn register_and_verify_clean() {
        let (env, _admin, client) = setup();
        let advertiser = Address::generate(&env);
        client.register_campaign(&1u64, &advertiser, &1_000_000i128);
        assert!(client.verify_batch(&1u64, &100u32));
        assert_eq!(client.get_score(&1u64), 0);
    }

    #[test]
    fn fraud_reports_trigger_slash_reject() {
        let (env, _admin, client) = setup();
        let advertiser = Address::generate(&env);
        let reporter = Address::generate(&env);
        client.register_campaign(&7u64, &advertiser, &1_000_000i128);
        // severity 4 * 25 = 100 >= 50
        client.report_fraud(&reporter, &7u64, &4u32);
        assert!(!client.verify_batch(&7u64, &50u32));
        let dep = client.get_deposit(&7u64).unwrap();
        assert!(dep.slashed > 0);
    }
}
