#!/usr/bin/env bash
# Deploy AdPulse contracts to Stellar Testnet.
# Usage: bash scripts/deploy.sh
# Optional: DEPLOY_SECRET=S...  (otherwise uses identity adpulse-deploy)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"

NETWORK="${NETWORK:-testnet}"
IDENTITY="${IDENTITY:-adpulse-deploy}"
OUT_DIR="$ROOT/deployments"
mkdir -p "$OUT_DIR"

echo "==> Building contracts"
stellar contract build

AD_WASM="$ROOT/contracts/target/wasm32v1-none/release/ad_space.wasm"
AF_WASM="$ROOT/contracts/target/wasm32v1-none/release/anti_fraud.wasm"
# Fallback path if toolchain uses wasm32-unknown-unknown
if [[ ! -f "$AD_WASM" ]]; then
  AD_WASM="$ROOT/contracts/target/wasm32-unknown-unknown/release/ad_space.wasm"
  AF_WASM="$ROOT/contracts/target/wasm32-unknown-unknown/release/anti_fraud.wasm"
fi

if [[ -n "${DEPLOY_SECRET:-}" ]]; then
  echo "==> Importing ephemeral identity from DEPLOY_SECRET"
  echo "$DEPLOY_SECRET" | stellar keys add "$IDENTITY" --secret-key 2>/dev/null || true
fi

if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  echo "==> Generating identity $IDENTITY"
  stellar keys generate --global "$IDENTITY" --network "$NETWORK" --fund || \
    stellar keys generate "$IDENTITY" --network "$NETWORK" --fund
fi

ADMIN="$(stellar keys address "$IDENTITY")"
echo "Admin: $ADMIN"

# Fund via friendbot if needed
curl -sS "https://friendbot.stellar.org?addr=$ADMIN" >/dev/null || true

NATIVE_SAC="$(stellar contract id asset --asset native --network "$NETWORK")"
echo "Native SAC: $NATIVE_SAC"

echo "==> Deploy anti_fraud"
AF_ID="$(stellar contract deploy \
  --wasm "$AF_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")"
echo "Anti-Fraud: $AF_ID"

echo "==> Initialize anti_fraud"
AF_INIT_HASH="$(stellar contract invoke \
  --id "$AF_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- \
  initialize \
  --admin "$ADMIN" 2>&1 | tee /dev/stderr | tail -n1 || true)"

echo "==> Deploy ad_space"
AD_ID="$(stellar contract deploy \
  --wasm "$AD_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")"
echo "Ad Space: $AD_ID"

echo "==> Initialize ad_space"
stellar contract invoke \
  --id "$AD_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- \
  initialize \
  --admin "$ADMIN" \
  --token "$NATIVE_SAC" \
  --anti_fraud "$AF_ID"

cat > "$OUT_DIR/testnet.json" <<EOF
{
  "network": "$NETWORK",
  "admin": "$ADMIN",
  "native_sac": "$NATIVE_SAC",
  "anti_fraud": "$AF_ID",
  "ad_space": "$AD_ID",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo ""
echo "Wrote $OUT_DIR/testnet.json"
echo "Set frontend env:"
echo "  VITE_AD_SPACE_CONTRACT=$AD_ID"
echo "  VITE_ANTI_FRAUD_CONTRACT=$AF_ID"
echo "  VITE_NATIVE_SAC=$NATIVE_SAC"
echo "  VITE_ESCROW_ACCOUNT=$ADMIN"
