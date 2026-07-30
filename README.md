# AdPulse

**Pay-per-impression micro-ad bidding on Stellar Testnet.**

Websites publish ad slots; advertisers escrow micro-XLM budgets; verified impression batches settle to publishers. An Anti-Fraud contract can slash deposits when bot/fake views are detected.

Built as a Stellar Build Station **Level 1 + Level 2 + Level 3** submission.

## Quick start

```bash
# Contracts
cd contracts
cargo test          # 7 passing (budget, rate-limit, expiry, domain, fraud, …)
stellar contract build

# Frontend
cd ../frontend
cp ../.env.example .env   # already filled below for current testnet deploy
npm install
npm run dev
```

- Wallet setup: [docs/WALLET_SETUP.md](docs/WALLET_SETUP.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Plan: [PLAN.md](PLAN.md)
- Demo placeholder: [docs/DEMO.md](docs/DEMO.md)

## Testnet deployment (verified)

| Item | Value |
|------|-------|
| Network | Testnet |
| Admin | `GC26WJ2BPKVQQTI4KO57VNUNXQQA4GB4SPKF3NPIHHTIWC53BAWN3TYT` |
| Native XLM SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Anti-Fraud | [`CDJNWLDHWZAOX72ENVAE7W2MOUWZDNLTKHDGQMMGJTWTL7Q4T57PUA4H`](https://stellar.expert/explorer/testnet/contract/CDJNWLDHWZAOX72ENVAE7W2MOUWZDNLTKHDGQMMGJTWTL7Q4T57PUA4H) |
| Ad Space | [`CCI2JKAC7VBL5QQLC2RXZHI5VLG3ETWCAP4VC5AXMK67J7GZY3NAFIE3`](https://stellar.expert/explorer/testnet/contract/CCI2JKAC7VBL5QQLC2RXZHI5VLG3ETWCAP4VC5AXMK67J7GZY3NAFIE3) |

### Transaction hashes

| Step | Hash |
|------|------|
| Anti-Fraud WASM upload | [`25f57b27…d1ee55`](https://stellar.expert/explorer/testnet/tx/25f57b271762fec89095edce0a9bd3f46ab5dfb0b5acf73011d2e67fb9d1ee55) |
| Anti-Fraud deploy | [`473f5ca3…f776bc`](https://stellar.expert/explorer/testnet/tx/473f5ca3528860baf3e015d0d3843696262c91315531cb92d5b40edd8ef776bc) |
| Anti-Fraud initialize | [`d6d9b648…05559d`](https://stellar.expert/explorer/testnet/tx/d6d9b64868f57c4b8214be46c2c61ec6390718339a17a5d591a28a9c0750559d) |
| Ad Space WASM upload | [`c3717430…3e58d5`](https://stellar.expert/explorer/testnet/tx/c371743070b37c997a6f0c67bc72e211e30fd49e6698f1385735e37dc63e58d5) |
| Ad Space deploy | [`0063a4e3…930ceb`](https://stellar.expert/explorer/testnet/tx/0063a4e30ec9760c27426cea0296c26ef01e5f790905b2a172cc923409930ceb) |
| Ad Space initialize | [`bc32702b…299eb2`](https://stellar.expert/explorer/testnet/tx/bc32702be3268486c780e078f7d8e1fcbce05809803639c72677e36669299eb2) |
| create_slot | [`28696dfa…f28576`](https://stellar.expert/explorer/testnet/tx/28696dfa7bd9f6f79a662cf11039fa0b7fd1a58ea4524b74ae9ab42c62f28576) |
| fund_campaign | [`f4ceb463…3e49de`](https://stellar.expert/explorer/testnet/tx/f4ceb463181de53d46242260ad6e417d2fb416ee36db670d3b4ac8e6833e49de) |
| settle_impressions (`imp_settl`) | [`9757749c…d96cc1`](https://stellar.expert/explorer/testnet/tx/9757749c17320abffd58597d7054da2976b596f81b87337528a2068323d96cc1) |

Full JSON: [deployments/testnet.json](deployments/testnet.json)

### Frontend `.env`

```
VITE_AD_SPACE_CONTRACT=CCI2JKAC7VBL5QQLC2RXZHI5VLG3ETWCAP4VC5AXMK67J7GZY3NAFIE3
VITE_ANTI_FRAUD_CONTRACT=CDJNWLDHWZAOX72ENVAE7W2MOUWZDNLTKHDGQMMGJTWTL7Q4T57PUA4H
VITE_NATIVE_SAC=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
VITE_ESCROW_ACCOUNT=GC26WJ2BPKVQQTI4KO57VNUNXQQA4GB4SPKF3NPIHHTIWC53BAWN3TYT
```

Never commit secret keys. Identity `adpulse-deploy` lives in local Stellar CLI config only.

### Redeploy

```bash
stellar keys generate adpulse-deploy --network testnet --fund
bash scripts/deploy.sh
bash scripts/invoke-smoke.sh
```

## Features by level

### Level 1
- Freighter / Testnet docs
- Connect + disconnect (Wallets Kit)
- XLM balance via Horizon
- Campaign budget escrow (Soroban + classic payment path)
- Tx success/fail + Stellar Expert links

### Level 2
- Multi-wallet (Freighter, xBull, LOBSTR, …)
- Ad Space on testnet; frontend read/write
- `ImpressionBatchSettled` (`imp_settl`) event streaming → live earnings
- Tx pending / success / fail
- Errors: exceeded budget, expired duration, invalid publisher domain

### Level 3
- Inter-contract Anti-Fraud `verify_batch` + slash
- Event streaming + GitHub Actions CI/CD
- Mobile publisher dashboard, CPM calculator, ad preview
- Loading / error states throughout
- Rust tests for budget depletion + rate-limited payouts (3+)
- Production architecture docs + this README
- Demo placeholder: [docs/DEMO.md](docs/DEMO.md)

## Joyride
Click **Tour** in the nav for an 8-step walkthrough (connect → fund → settle → CPM/preview).

## CI/CD
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `cargo test`, WASM build, and frontend build. Manual `workflow_dispatch` can deploy with `ADPULSE_DEPLOY_SECRET`.

## License
Demo project for Stellar Build Station.
