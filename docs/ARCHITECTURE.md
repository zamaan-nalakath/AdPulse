# AdPulse Production Architecture

## Components
1. **Ad Space contract** — slot registry, campaign escrow (native XLM via SAC), impression settlement, publisher earnings.
2. **Anti-Fraud contract** — deposit registry, fraud scoring, slash on verify failure (inter-contract).
3. **Frontend** — React + Vite; Stellar Wallets Kit; Horizon balance; RPC invoke + event polling.
4. **CI/CD** — GitHub Actions: `cargo test`, WASM build, frontend build; manual testnet deploy job.

## Trust model
- Advertisers authorize SAC transfers into Ad Space.
- Publishers authorize settle/withdraw.
- Anti-fraud `verify_batch` is called atomically inside `settle_impressions`. High fraud score → slash recorded + settlement aborted (`FraudRejected`).
- Impression telemetry is assumed attested off-chain in production (oracle/TEE); this demo uses publisher-signed batches + on-chain rate limits.

## Data & TTL
- Instance: admin, token, anti-fraud address, counters.
- Persistent: slots, campaigns, earnings, last-settle timestamps, fraud records.
- TTL extended on writes (~30 days).

## Failure modes surfaced in UI
| Error | User copy |
|-------|-----------|
| ExceededCampaignBudget | Escrow cannot cover batch |
| ExpiredAdDuration | Campaign window closed |
| InvalidPublisherDomain | Hostname invalid |
| RateLimited | 60s cooldown |
| FraudRejected | Anti-fraud slash path |

## Scaling notes
- Index `imp_settl` events in a dedicated indexer for dashboards.
- Split high-volume settle relays from UI wallets.
- Replace simple fraud score with attestations (ZK / TEE) while keeping the same verify interface.
