# AdPulse — Stellar Build Station Plan

**Product:** Open micro-advertising protocol on Stellar. Publishers embed ad slots; advertisers fund campaigns with micro-XLM escrow; verified impressions settle to publishers. Anti-fraud can slash deposits when bot/fake views are detected.

**Network:** Stellar Testnet  
**Stack:** Soroban (Rust), React + Vite + TypeScript, `@stellar/stellar-sdk`, `@creit.tech/stellar-wallets-kit`, `react-joyride`

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React Frontend (Vite)                                       │
│  Wallet Kit · Joyride · Publisher Dashboard · Ad Preview    │
└───────────────┬─────────────────────────────┬───────────────┘
                │ Horizon / RPC               │ Events
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│  Ad Space Contract        │──▶│  Anti-Fraud Contract        │
│  · create_slot            │   │  · register_campaign        │
│  · fund_campaign (escrow) │   │  · report_fraud             │
│  · settle_impressions     │   │  · verify_batch (slash?)    │
│  · withdraw_earnings      │   │  · get_score                │
│  Events: ImpressionBatch  │   └─────────────────────────────┘
│          Settled          │
└───────────────────────────┘
                │
                ▼
         Native XLM (SAC)
```

**Flow**
1. Publisher registers an ad slot (domain + CPM rate).
2. Advertiser funds a campaign → XLM transferred into Ad Space escrow (via SAC).
3. Publisher reports impression batches; Ad Space calls Anti-Fraud `verify_batch`.
4. If clean → payout publisher from escrow, emit `ImpressionBatchSettled`.
5. If fraud → slash portion of campaign deposit to a slash sink / protocol reserve.

---

## 2. Contracts

### 2.1 `ad_space`
| Function | Auth | Purpose |
|----------|------|---------|
| `initialize(admin, token, anti_fraud)` | once | Wire SAC + anti-fraud addresses |
| `create_slot(publisher, domain, cpm_stroops)` | publisher | Register slot |
| `fund_campaign(advertiser, slot_id, budget, duration_secs, creative_url)` | advertiser | Escrow XLM, create campaign |
| `settle_impressions(publisher, campaign_id, view_count)` | publisher | Rate-limited payout after anti-fraud check |
| `withdraw_earnings(publisher)` | publisher | Withdraw accrued earnings |
| `get_campaign / get_slot / get_earnings` | view | Read state |

**Errors:** `ExceededCampaignBudget`, `ExpiredAdDuration`, `InvalidPublisherDomain`, `NotInitialized`, `Unauthorized`, `RateLimited`, `FraudRejected`

**Event:** `ImpressionBatchSettled { campaign_id, publisher, views, payout }`

### 2.2 `anti_fraud`
| Function | Auth | Purpose |
|----------|------|---------|
| `initialize(admin)` | once | Set admin |
| `register_campaign(campaign_id, advertiser, deposit)` | callable by ad_space / admin | Track deposit for slash |
| `report_fraud(reporter, campaign_id, severity)` | reporter | Flag campaign |
| `verify_batch(campaign_id, view_count) -> bool` | callable | Return ok / slash on high fraud score |
| `slash(campaign_id, amount)` | admin / internal | Reduce deposit |
| `get_score(campaign_id)` | view | Fraud score |

**Inter-contract:** `ad_space.settle_impressions` → `anti_fraud.verify_batch`. On fail, settlement aborts / partial slash recorded.

### 2.3 Tests (3+)
1. Budget depletion — settle until budget exhausted → `ExceededCampaignBudget`
2. Rate-limiting — second settle within cooldown → `RateLimited`
3. Expired duration — settle after expiry → `ExpiredAdDuration`
4. (bonus) Invalid domain / fraud slash path

---

## 3. Frontend

```
frontend/
  src/
    components/   # WalletButton, TxStatus, AdPreview, CpmCalculator, JoyrideTour
    hooks/        # useWallet, useBalance, useEvents
    lib/          # stellar.ts, contracts.ts, errors.ts
    pages/        # Advertiser, Publisher dashboard
    App.tsx, main.tsx, styles/
```

- **Multi-wallet** via StellarWalletsKit (Freighter, xBull, Lobstr, …)
- Connect / disconnect + XLM balance (Horizon)
- Fund campaign → escrow payment + contract invoke; show pending/success/fail + Stellar Expert link
- Publisher dashboard (mobile-responsive): earnings live via event stream, CPM calculator, ad preview frame
- Map contract errors to user-facing copy for the 3 required errors
- **react-joyride** walkthrough of connect → fund → settle → earnings

**Aesthetic:** Media-network / broadcast board — ink black, signal amber, newsprint texture, expressive display type (not purple-gradient AI default).

---

## 4. Level checklist mapping

### Level 1
| Req | Plan item |
|-----|-----------|
| Freighter + Testnet docs | README § Wallet Setup |
| Connect / disconnect | `useWallet` + WalletButton |
| Display XLM balance | Horizon `loadAccount` |
| Transfer budget to escrow | `fund_campaign` + SAC transfer |
| Solid UI + errors | Status banner, Expert links |

### Level 2
| Req | Plan item |
|-----|-----------|
| Multi-wallet | StellarWalletsKit |
| Deploy Ad Space | scripts/deploy.sh → testnet |
| Read/write from UI | get_* + fund/settle |
| ImpressionBatchSettled live | RPC event poll / getEvents |
| Tx pending/success/fail | TxStatus component |
| 3 errors | budget / expired / invalid domain |
| 10+ commits | Incremental commits (Nidaal) |

### Level 3
| Req | Plan item |
|-----|-----------|
| Inter-contract anti-fraud | `verify_batch` + slash |
| Event streaming | Publisher earnings feed |
| CI/CD | `.github/workflows/ci.yml` |
| Mobile publisher dashboard | CPM + preview |
| Loading/error states | All async paths |
| Rust tests 3+ | budget + rate-limit + expiry |
| Production architecture + README | This plan + README |
| Demo video placeholder | README / docs/DEMO.md |

---

## 5. Joyride steps
1. Welcome — what AdPulse is  
2. Connect wallet  
3. Check XLM balance / Friendbot tip  
4. Create / view ad slot  
5. Fund campaign (escrow)  
6. Publisher: settle impressions  
7. Watch earnings update from events  
8. CPM calculator + ad preview  

---

## 6. Testnet deploy
1. `stellar keys generate adpulse-deploy --network testnet --fund` (or friendbot)
2. Build both contracts → WASM
3. Deploy `anti_fraud`, then `ad_space` with constructor/init args
4. Invoke smoke: create_slot, fund_campaign, settle_impressions
5. Record contract IDs + tx hashes in README  
**Never commit secrets** — `.env.example` only

---

## 7. CI/CD
GitHub Actions:
- `cargo test` (contracts)
- `stellar contract build` (or cargo wasm build)
- `npm ci && npm run build` (frontend)
- Optional deploy workflow (manual `workflow_dispatch`)

---

## 8. Folder structure

```
AdPulse/
├── PLAN.md
├── README.md
├── .gitignore
├── .env.example
├── docs/
│   ├── WALLET_SETUP.md
│   ├── ARCHITECTURE.md
│   └── DEMO.md
├── contracts/
│   ├── Cargo.toml                 # workspace
│   ├── ad_space/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   └── anti_fraud/
│       ├── Cargo.toml
│       └── src/lib.rs
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/...
├── scripts/
│   ├── deploy.sh
│   └── invoke-smoke.sh
└── .github/workflows/
    └── ci.yml
```

---

## 9. Implementation order
1. PLAN.md ✓  
2. Anti-fraud contract + tests  
3. Ad Space contract + tests (inter-contract)  
4. Frontend scaffold + wallet + balance  
5. Contract bindings / invoke helpers + fund flow  
6. Publisher dashboard, events, CPM, preview, Joyride  
7. CI, docs, deploy scripts  
8. Testnet deploy + record IDs  
9. Polish README + final checklist  

---

## 10. Production architecture notes
- Escrow accounting on-chain; off-chain impression telemetry feeds settle batches (oracle-style reporter with auth).
- Anti-fraud score is intentionally simple for Level 3 demo (severity reports + rate heuristics); production would plug ML attestations / TEE attestations.
- SAC for native XLM; instance TTL extended on writes; persistent keys for campaigns/slots.
- Frontend never holds secrets; signing only via wallet kit.
