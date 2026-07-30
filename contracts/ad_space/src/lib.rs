#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short, token,
    Address, Env, String,
};

/// Client interface for the Anti-Fraud verification contract (inter-contract calls).
#[contractclient(name = "AntiFraudClient")]
pub trait AntiFraudTrait {
    fn register_campaign(campaign_id: u64, advertiser: Address, deposit: i128);
    fn verify_batch(campaign_id: u64, view_count: u32) -> bool;
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    ExceededCampaignBudget = 4,
    ExpiredAdDuration = 5,
    InvalidPublisherDomain = 6,
    SlotNotFound = 7,
    CampaignNotFound = 8,
    InvalidAmount = 9,
    RateLimited = 10,
    FraudRejected = 11,
    EmptyDomain = 12,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    AntiFraud,
    Initialized,
    SlotCount,
    CampaignCount,
    Slot(u64),
    Campaign(u64),
    Earnings(Address),
    LastSettle(u64),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdSlot {
    pub slot_id: u64,
    pub publisher: Address,
    pub domain: String,
    pub cpm_stroops: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    pub campaign_id: u64,
    pub slot_id: u64,
    pub advertiser: Address,
    pub budget: i128,
    pub spent: i128,
    pub expires_at: u64,
    pub creative_url: String,
    pub active: bool,
}

/// Minimum seconds between settle calls per campaign (rate limit).
const SETTLE_COOLDOWN_SECS: u64 = 60;
/// Max domain length chars (soft check via empty + basic rules).
const TTL_THRESHOLD: u32 = 100;
const TTL_EXTEND: u32 = 518400;

#[contract]
pub struct AdSpace;

#[contractimpl]
impl AdSpace {
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        anti_fraud: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::AntiFraud, &anti_fraud);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::SlotCount, &0u64);
        env.storage().instance().set(&DataKey::CampaignCount, &0u64);
        env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
        Ok(())
    }

    pub fn create_slot(
        env: Env,
        publisher: Address,
        domain: String,
        cpm_stroops: i128,
    ) -> Result<u64, Error> {
        publisher.require_auth();
        Self::require_init(&env)?;
        if cpm_stroops <= 0 {
            return Err(Error::InvalidAmount);
        }
        Self::validate_domain(&env, &domain)?;

        let slot_id: u64 = env.storage().instance().get(&DataKey::SlotCount).unwrap_or(0);
        let slot = AdSlot {
            slot_id,
            publisher: publisher.clone(),
            domain,
            cpm_stroops,
        };
        env.storage().persistent().set(&DataKey::Slot(slot_id), &slot);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Slot(slot_id), TTL_THRESHOLD, TTL_EXTEND);
        env.storage()
            .instance()
            .set(&DataKey::SlotCount, &(slot_id + 1));
        env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND);

        env.events()
            .publish((symbol_short!("slot_new"), slot_id), publisher);
        Ok(slot_id)
    }

    /// Advertiser escrows XLM budget into this contract for a campaign.
    pub fn fund_campaign(
        env: Env,
        advertiser: Address,
        slot_id: u64,
        budget: i128,
        duration_secs: u64,
        creative_url: String,
    ) -> Result<u64, Error> {
        advertiser.require_auth();
        Self::require_init(&env)?;
        if budget <= 0 || duration_secs == 0 {
            return Err(Error::InvalidAmount);
        }

        let slot: AdSlot = env
            .storage()
            .persistent()
            .get(&DataKey::Slot(slot_id))
            .ok_or(Error::SlotNotFound)?;

        // Re-validate publisher domain still present on slot
        Self::validate_domain(&env, &slot.domain)?;

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token = token::Client::new(&env, &token_addr);
        token.transfer(&advertiser, &env.current_contract_address(), &budget);

        let campaign_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0);
        let expires_at = env.ledger().timestamp().saturating_add(duration_secs);
        let campaign = Campaign {
            campaign_id,
            slot_id,
            advertiser: advertiser.clone(),
            budget,
            spent: 0,
            expires_at,
            creative_url,
            active: true,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);
        env.storage().persistent().extend_ttl(
            &DataKey::Campaign(campaign_id),
            TTL_THRESHOLD,
            TTL_EXTEND,
        );
        env.storage()
            .instance()
            .set(&DataKey::CampaignCount, &(campaign_id + 1));

        // Inter-contract: register deposit with anti-fraud
        let anti_fraud: Address = env.storage().instance().get(&DataKey::AntiFraud).unwrap();
        let af = AntiFraudClient::new(&env, &anti_fraud);
        af.register_campaign(&campaign_id, &advertiser, &budget);

        env.events().publish(
            (symbol_short!("camp_fund"), campaign_id),
            (advertiser, budget, slot_id),
        );
        Ok(campaign_id)
    }

    /// Publisher settles a verified impression batch. Pays CPM * views / 1000 from escrow.
    pub fn settle_impressions(
        env: Env,
        publisher: Address,
        campaign_id: u64,
        view_count: u32,
    ) -> Result<i128, Error> {
        publisher.require_auth();
        Self::require_init(&env)?;
        if view_count == 0 {
            return Err(Error::InvalidAmount);
        }

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)?;

        if !campaign.active {
            return Err(Error::ExceededCampaignBudget);
        }
        if env.ledger().timestamp() > campaign.expires_at {
            return Err(Error::ExpiredAdDuration);
        }

        // Rate limit
        let last_key = DataKey::LastSettle(campaign_id);
        if env.storage().persistent().has(&last_key) {
            let last: u64 = env.storage().persistent().get(&last_key).unwrap_or(0);
            let now = env.ledger().timestamp();
            if now.saturating_sub(last) < SETTLE_COOLDOWN_SECS {
                return Err(Error::RateLimited);
            }
        }
        let now = env.ledger().timestamp();

        let slot: AdSlot = env
            .storage()
            .persistent()
            .get(&DataKey::Slot(campaign.slot_id))
            .ok_or(Error::SlotNotFound)?;

        if slot.publisher != publisher {
            return Err(Error::Unauthorized);
        }
        Self::validate_domain(&env, &slot.domain)?;

        // Inter-contract anti-fraud verification (may slash on-chain deposit record)
        let anti_fraud: Address = env.storage().instance().get(&DataKey::AntiFraud).unwrap();
        let af = AntiFraudClient::new(&env, &anti_fraud);
        if !af.verify_batch(&campaign_id, &view_count) {
            return Err(Error::FraudRejected);
        }

        // payout = cpm_stroops * views / 1000
        let payout = slot
            .cpm_stroops
            .checked_mul(view_count as i128)
            .unwrap_or(0)
            / 1000;
        if payout <= 0 {
            return Err(Error::InvalidAmount);
        }

        let remaining = campaign.budget.saturating_sub(campaign.spent);
        if payout > remaining {
            return Err(Error::ExceededCampaignBudget);
        }

        campaign.spent = campaign.spent.saturating_add(payout);
        if campaign.spent >= campaign.budget {
            campaign.active = false;
        }
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);
        env.storage()
            .persistent()
            .set(&DataKey::LastSettle(campaign_id), &now);

        let mut earnings: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Earnings(publisher.clone()))
            .unwrap_or(0);
        earnings = earnings.saturating_add(payout);
        env.storage()
            .persistent()
            .set(&DataKey::Earnings(publisher.clone()), &earnings);

        // Event: ImpressionBatchSettled — frontend streams this for live earnings
        env.events().publish(
            (symbol_short!("imp_settl"), campaign_id),
            (publisher.clone(), view_count, payout, earnings),
        );

        Ok(payout)
    }

    pub fn withdraw_earnings(env: Env, publisher: Address) -> Result<i128, Error> {
        publisher.require_auth();
        Self::require_init(&env)?;
        let earnings: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Earnings(publisher.clone()))
            .unwrap_or(0);
        if earnings <= 0 {
            return Err(Error::InvalidAmount);
        }
        env.storage()
            .persistent()
            .set(&DataKey::Earnings(publisher.clone()), &0i128);

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token = token::Client::new(&env, &token_addr);
        token.transfer(&env.current_contract_address(), &publisher, &earnings);
        Ok(earnings)
    }

    pub fn get_slot(env: Env, slot_id: u64) -> Option<AdSlot> {
        env.storage().persistent().get(&DataKey::Slot(slot_id))
    }

    pub fn get_campaign(env: Env, campaign_id: u64) -> Option<Campaign> {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
    }

    pub fn get_earnings(env: Env, publisher: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Earnings(publisher))
            .unwrap_or(0)
    }

    pub fn get_slot_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::SlotCount).unwrap_or(0)
    }

    pub fn get_campaign_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0)
    }

    fn require_init(env: &Env) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            Ok(())
        } else {
            Err(Error::NotInitialized)
        }
    }

    /// Reject empty domains and domains containing spaces (invalid publisher domain).
    fn validate_domain(env: &Env, domain: &String) -> Result<(), Error> {
        if domain.is_empty() {
            return Err(Error::InvalidPublisherDomain);
        }
        // Reject domains that are just "." or contain whitespace via byte scan
        let len = domain.len() as usize;
        if len < 3 {
            return Err(Error::InvalidPublisherDomain);
        }
        let mut buf = [0u8; 128];
        let copy_len = if len > 128 { 128 } else { len };
        // String::copy_into_slice available in soroban
        let _ = env; // keep signature flexible
        domain.copy_into_slice(&mut buf[..copy_len]);
        for i in 0..copy_len {
            let c = buf[i];
            if c == b' ' || c == b'\t' || c == b'\n' {
                return Err(Error::InvalidPublisherDomain);
            }
        }
        // Must contain a dot for TLD-ish check
        if !buf[..copy_len].contains(&b'.') {
            return Err(Error::InvalidPublisherDomain);
        }
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{token::StellarAssetClient, Env};

    fn setup<'a>() -> (
        Env,
        Address,
        Address,
        Address,
        AdSpaceClient<'a>,
        Address,
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_address = sac.address();

        let anti_fraud_id = env.register(anti_fraud::AntiFraud, ());
        let af_client = anti_fraud::AntiFraudClient::new(&env, &anti_fraud_id);
        af_client.initialize(&admin);

        let ad_space_id = env.register(AdSpace, ());
        let client = AdSpaceClient::new(&env, &ad_space_id);
        client.initialize(&admin, &token_address, &anti_fraud_id);

        (env, admin, token_address, anti_fraud_id, client, token_admin)
    }

    fn mint(env: &Env, token: &Address, to: &Address, amount: i128) {
        let sac = StellarAssetClient::new(env, token);
        sac.mint(to, &amount);
    }

    #[test]
    fn fund_and_settle_happy_path() {
        let (env, _admin, token, _af, client, _ta) = setup();
        let publisher = Address::generate(&env);
        let advertiser = Address::generate(&env);
        mint(&env, &token, &advertiser, 10_000_000);

        let domain = String::from_str(&env, "news.example.com");
        let slot_id = client.create_slot(&publisher, &domain, &1_000_000i128);

        let cid = client.fund_campaign(
            &advertiser,
            &slot_id,
            &5_000_000i128,
            &3600u64,
            &String::from_str(&env, "https://cdn.example/ad.png"),
        );

        // 1000 views * 1_000_000 / 1000 = 1_000_000 stroops
        let payout = client.settle_impressions(&publisher, &cid, &1000u32);
        assert_eq!(payout, 1_000_000);
        assert_eq!(client.get_earnings(&publisher), 1_000_000);
    }

    /// Budget depletion: settling more than remaining budget fails.
    #[test]
    fn test_budget_depletion() {
        let (env, _admin, token, _af, client, _ta) = setup();
        let publisher = Address::generate(&env);
        let advertiser = Address::generate(&env);
        mint(&env, &token, &advertiser, 10_000_000);

        let domain = String::from_str(&env, "blog.publisher.io");
        let slot_id = client.create_slot(&publisher, &domain, &1_000_000i128);
        let cid = client.fund_campaign(
            &advertiser,
            &slot_id,
            &1_000_000i128,
            &7200u64,
            &String::from_str(&env, "https://cdn.example/ad2.png"),
        );

        // First settle ok: 500 views → 500_000
        client.settle_impressions(&publisher, &cid, &500u32);

        // Advance past cooldown
        env.ledger().with_mut(|l| {
            l.timestamp += SETTLE_COOLDOWN_SECS + 1;
        });

        // Remaining 500_000; 1000 views needs 1_000_000 → ExceededCampaignBudget
        let err = client
            .try_settle_impressions(&publisher, &cid, &1000u32)
            .unwrap_err();
        assert_eq!(err.unwrap(), Error::ExceededCampaignBudget);
    }

    /// Rate-limiting: second settle within cooldown fails.
    #[test]
    fn test_rate_limiting_payouts() {
        let (env, _admin, token, _af, client, _ta) = setup();
        let publisher = Address::generate(&env);
        let advertiser = Address::generate(&env);
        mint(&env, &token, &advertiser, 50_000_000);

        let domain = String::from_str(&env, "media.pulse.dev");
        let slot_id = client.create_slot(&publisher, &domain, &100_000i128);
        let cid = client.fund_campaign(
            &advertiser,
            &slot_id,
            &20_000_000i128,
            &86400u64,
            &String::from_str(&env, "https://cdn.example/ad3.png"),
        );

        client.settle_impressions(&publisher, &cid, &100u32);

        let err = client
            .try_settle_impressions(&publisher, &cid, &100u32)
            .unwrap_err();
        assert_eq!(err.unwrap(), Error::RateLimited);
    }

    #[test]
    fn test_expired_ad_duration() {
        let (env, _admin, token, _af, client, _ta) = setup();
        let publisher = Address::generate(&env);
        let advertiser = Address::generate(&env);
        mint(&env, &token, &advertiser, 10_000_000);

        let domain = String::from_str(&env, "ads.site.net");
        let slot_id = client.create_slot(&publisher, &domain, &500_000i128);
        let cid = client.fund_campaign(
            &advertiser,
            &slot_id,
            &5_000_000i128,
            &100u64,
            &String::from_str(&env, "https://cdn.example/ad4.png"),
        );

        env.ledger().with_mut(|l| {
            l.timestamp += 101;
        });

        let err = client
            .try_settle_impressions(&publisher, &cid, &10u32)
            .unwrap_err();
        assert_eq!(err.unwrap(), Error::ExpiredAdDuration);
    }

    #[test]
    fn test_invalid_publisher_domain() {
        let (env, _admin, _token, _af, client, _ta) = setup();
        let publisher = Address::generate(&env);
        let bad = String::from_str(&env, "not a domain");
        let err = client
            .try_create_slot(&publisher, &bad, &1000i128)
            .unwrap_err();
        assert_eq!(err.unwrap(), Error::InvalidPublisherDomain);
    }
}
