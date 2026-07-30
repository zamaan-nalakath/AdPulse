import * as StellarSdk from "@stellar/stellar-sdk";
import {
  HORIZON_URL,
  RPC_URL,
  NETWORK_PASSPHRASE,
  FRIENDBOT_URL,
} from "./config";

export const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);
export const rpc = new StellarSdk.rpc.Server(RPC_URL);
export { StellarSdk, NETWORK_PASSPHRASE };

export async function getXlmBalance(address: string): Promise<string> {
  try {
    const account = await horizon.loadAccount(address);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native?.balance ?? "0";
  } catch (e: unknown) {
    const err = e as { response?: { status?: number } };
    if (err?.response?.status === 404) return "0";
    throw e;
  }
}

export async function fundWithFriendbot(address: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Friendbot failed: ${text}`);
  }
}

export type TxPhase = "idle" | "building" | "signing" | "pending" | "success" | "fail";

export async function submitClassic(
  signedXdr: string
): Promise<{ hash: string }> {
  const tx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE
  ) as StellarSdk.Transaction;
  const result = await horizon.submitTransaction(tx);
  return { hash: result.hash };
}

export async function submitSoroban(
  signedXdr: string
): Promise<{ hash: string; returnValue?: StellarSdk.xdr.ScVal }> {
  const tx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE
  ) as StellarSdk.Transaction;

  const send = await rpc.sendTransaction(tx);
  if (send.status === "ERROR") {
    throw new Error(`Submit error: ${JSON.stringify(send.errorResult)}`);
  }

  const hash = send.hash;
  let getTx = await rpc.getTransaction(hash);
  const start = Date.now();
  while (getTx.status === "NOT_FOUND" && Date.now() - start < 60_000) {
    await new Promise((r) => setTimeout(r, 1500));
    getTx = await rpc.getTransaction(hash);
  }

  if (getTx.status === "SUCCESS") {
    return { hash, returnValue: getTx.returnValue };
  }
  throw new Error(`Transaction ${getTx.status}: ${hash}`);
}

export async function prepareContractCall(
  source: string,
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[]
): Promise<string> {
  const account = await rpc.getAccount(source);
  const contract = new StellarSdk.Contract(contractId);
  let tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  const sim = await rpc.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(sim)) {
    throw new Error(mapSimError(sim.error));
  }
  tx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
  return tx.toXDR();
}

export async function buildPaymentXdr(
  source: string,
  destination: string,
  amountXlm: string
): Promise<string> {
  const account = await horizon.loadAccount(source);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination,
        asset: StellarSdk.Asset.native(),
        amount: amountXlm,
      })
    )
    .setTimeout(180)
    .build();
  return tx.toXDR();
}

function mapSimError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("exceededcampaignbudget") || lower.includes("#4")) {
    return "Exceeded campaign budget — not enough escrow left for this impression batch.";
  }
  if (lower.includes("expiredadduration") || lower.includes("#5")) {
    return "Expired ad duration — this campaign has ended.";
  }
  if (lower.includes("invalidpublisherdomain") || lower.includes("#6")) {
    return "Invalid publisher domain — use a hostname like ads.example.com (no spaces).";
  }
  if (lower.includes("ratelimited") || lower.includes("#10")) {
    return "Rate limited — wait 60s between impression settlements.";
  }
  if (lower.includes("fraudrejected") || lower.includes("#11")) {
    return "Anti-fraud rejected this batch — deposit may have been slashed.";
  }
  return `Simulation failed: ${raw}`;
}

export { mapSimError };
