import { StellarSdk, prepareContractCall, submitSoroban } from "./stellar";
import { AD_SPACE_CONTRACT } from "./config";

export function requireAdSpace(): string {
  if (!AD_SPACE_CONTRACT) {
    throw new Error(
      "VITE_AD_SPACE_CONTRACT is not set. Deploy contracts and copy IDs into .env"
    );
  }
  return AD_SPACE_CONTRACT;
}

export function stroopsFromXlm(xlm: string): bigint {
  const n = Number(xlm);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid XLM amount");
  return BigInt(Math.round(n * 10_000_000));
}

export function xlmFromStroops(stroops: bigint | number | string): string {
  const s = BigInt(stroops);
  const whole = s / 10_000_000n;
  const frac = (s % 10_000_000n).toString().padStart(7, "0");
  return `${whole}.${frac}`;
}

type SignFn = (xdr: string) => Promise<string>;

async function invoke(
  source: string,
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
  sign: SignFn
): Promise<{ hash: string; returnValue?: StellarSdk.xdr.ScVal }> {
  const xdr = await prepareContractCall(source, contractId, method, args);
  const signed = await sign(xdr);
  return submitSoroban(signed);
}

export async function createSlot(
  source: string,
  domain: string,
  cpmStroops: bigint,
  sign: SignFn
) {
  const id = requireAdSpace();
  return invoke(
    source,
    id,
    "create_slot",
    [
      StellarSdk.Address.fromString(source).toScVal(),
      StellarSdk.nativeToScVal(domain, { type: "string" }),
      StellarSdk.nativeToScVal(cpmStroops, { type: "i128" }),
    ],
    sign
  );
}

export async function fundCampaign(
  source: string,
  slotId: number,
  budgetStroops: bigint,
  durationSecs: number,
  creativeUrl: string,
  sign: SignFn
) {
  const id = requireAdSpace();
  return invoke(
    source,
    id,
    "fund_campaign",
    [
      StellarSdk.Address.fromString(source).toScVal(),
      StellarSdk.nativeToScVal(slotId, { type: "u64" }),
      StellarSdk.nativeToScVal(budgetStroops, { type: "i128" }),
      StellarSdk.nativeToScVal(durationSecs, { type: "u64" }),
      StellarSdk.nativeToScVal(creativeUrl, { type: "string" }),
    ],
    sign
  );
}

export async function settleImpressions(
  source: string,
  campaignId: number,
  viewCount: number,
  sign: SignFn
) {
  const id = requireAdSpace();
  return invoke(
    source,
    id,
    "settle_impressions",
    [
      StellarSdk.Address.fromString(source).toScVal(),
      StellarSdk.nativeToScVal(campaignId, { type: "u64" }),
      StellarSdk.nativeToScVal(viewCount, { type: "u32" }),
    ],
    sign
  );
}

export async function withdrawEarnings(source: string, sign: SignFn) {
  const id = requireAdSpace();
  return invoke(
    source,
    id,
    "withdraw_earnings",
    [StellarSdk.Address.fromString(source).toScVal()],
    sign
  );
}

export async function readEarnings(publisher: string): Promise<bigint> {
  const id = requireAdSpace();
  const { rpc, StellarSdk: S, NETWORK_PASSPHRASE } = await import("./stellar");
  const account = await rpc.getAccount(publisher);
  const contract = new S.Contract(id);
  const tx = new S.TransactionBuilder(account, {
    fee: S.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "get_earnings",
        S.Address.fromString(publisher).toScVal()
      )
    )
    .setTimeout(30)
    .build();
  const sim = await rpc.simulateTransaction(tx);
  if (S.rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  if (S.rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
    return BigInt(S.scValToNative(sim.result.retval));
  }
  return 0n;
}

export function parseContractError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("exceeded campaign budget") || m.includes("exceededcampaignbudget")) {
    return "Exceeded campaign budget — escrow cannot cover this batch.";
  }
  if (m.includes("expired ad duration") || m.includes("expiredadduration")) {
    return "Expired ad duration — campaign window has closed.";
  }
  if (m.includes("invalid publisher domain") || m.includes("invalidpublisherdomain")) {
    return "Invalid publisher domain — hostname must include a TLD and no spaces.";
  }
  return message;
}
