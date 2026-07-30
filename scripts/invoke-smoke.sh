#!/usr/bin/env bash
# Smoke-invoke AdPulse on testnet using deployments/testnet.json
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CFG="$ROOT/deployments/testnet.json"
IDENTITY="${IDENTITY:-adpulse-deploy}"
NETWORK="${NETWORK:-testnet}"

if [[ ! -f "$CFG" ]]; then
  echo "Missing $CFG — run scripts/deploy.sh first"
  exit 1
fi

AD_ID="$(python -c "import json;print(json.load(open(r'$CFG'))['ad_space'])" 2>/dev/null || node -e "console.log(require('$CFG').ad_space)")"
ADMIN="$(stellar keys address "$IDENTITY")"

echo "==> create_slot"
SLOT="$(stellar contract invoke --id "$AD_ID" --source "$IDENTITY" --network "$NETWORK" -- \
  create_slot --publisher "$ADMIN" --domain '"demo.adpulse.test"' --cpm_stroops 1000000)"
echo "slot=$SLOT"

echo "==> fund_campaign (1 XLM = 10000000 stroops, 1 day)"
CAMP="$(stellar contract invoke --id "$AD_ID" --source "$IDENTITY" --network "$NETWORK" -- \
  fund_campaign \
  --advertiser "$ADMIN" \
  --slot_id "$SLOT" \
  --budget 10000000 \
  --duration_secs 86400 \
  --creative_url '"https://placehold.co/728x90"')"
echo "campaign=$CAMP"

echo "==> settle_impressions 500 views"
stellar contract invoke --id "$AD_ID" --source "$IDENTITY" --network "$NETWORK" -- \
  settle_impressions --publisher "$ADMIN" --campaign_id "$CAMP" --view_count 500

echo "==> get_earnings"
stellar contract invoke --id "$AD_ID" --source "$IDENTITY" --network "$NETWORK" -- \
  get_earnings --publisher "$ADMIN"

echo "Smoke OK"
