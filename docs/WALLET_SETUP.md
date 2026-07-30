# Freighter + Stellar Testnet Setup (Level 1)

## 1. Install Freighter
1. Install the [Freighter browser extension](https://freighter.app/).
2. Create or import a wallet.
3. Open Freighter → **Settings** → **Network** → select **Testnet**.

## 2. Fund with Friendbot
Your Testnet account needs XLM:

```bash
curl "https://friendbot.stellar.org?addr=GYOURADDRESS"
```

Or use the **Friendbot** button in the AdPulse UI after connecting.

## 3. Connect in AdPulse
1. `cd AdPulse/frontend && npm install && npm run dev`
2. Click **Connect Wallet** (Stellar Wallets Kit — Freighter, xBull, LOBSTR, …)
3. Approve the connection prompt in Freighter
4. Confirm your XLM balance appears in the header

## 4. Disconnect
Use **Disconnect** to clear the local session (the extension stays installed).

## Network endpoints
| Service | URL |
|---------|-----|
| Horizon | https://horizon-testnet.stellar.org |
| Soroban RPC | https://soroban-testnet.stellar.org |
| Friendbot | https://friendbot.stellar.org |
| Passphrase | `Test SDF Network ; September 2015` |

## Level 1 escrow demo
1. Connect wallet and confirm balance.
2. On **Advertiser**, set budget XLM and click **Fund Campaign Escrow** (Soroban) or **Classic XLM Escrow** (Horizon payment to `VITE_ESCROW_ACCOUNT`).
3. Confirm pending → success in the status panel and open the Stellar Expert link.

## Troubleshooting
- **Wrong network:** Freighter must be on Testnet; otherwise txs fail auth.
- **Balance 0 / account not found:** fund with Friendbot.
- **Extension not detected:** refresh the page; allow the site in Freighter.
- **Contract not set:** copy IDs from `deployments/testnet.json` into `frontend/.env`.
