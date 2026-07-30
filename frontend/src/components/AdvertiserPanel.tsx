import { FormEvent, useState } from "react";
import { TxStatus } from "./TxStatus";
import type { TxPhase } from "../lib/stellar";
import {
  buildPaymentXdr,
  submitClassic,
  fundWithFriendbot,
} from "../lib/stellar";
import {
  createSlot,
  fundCampaign,
  stroopsFromXlm,
  parseContractError,
} from "../lib/contracts";
import { ESCROW_ACCOUNT, AD_SPACE_CONTRACT, EXPERT_CONTRACT } from "../lib/config";

type Props = {
  address: string | null;
  sign: (xdr: string) => Promise<string>;
  onBalanceRefresh: () => void;
};

export function AdvertiserPanel({ address, sign, onBalanceRefresh }: Props) {
  const [domain, setDomain] = useState("news.example.com");
  const [cpmXlm, setCpmXlm] = useState("0.1");
  const [budgetXlm, setBudgetXlm] = useState("2");
  const [duration, setDuration] = useState("86400");
  const [creative, setCreative] = useState("https://placehold.co/728x90/e8a317/0c0b09?text=AdPulse");
  const [slotId, setSlotId] = useState("0");
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e: unknown) {
      setPhase("fail");
      setMsg(parseContractError(e instanceof Error ? e.message : String(e)));
    }
  };

  const onCreateSlot = (e: FormEvent) => {
    e.preventDefault();
    if (!address) return setMsg("Connect wallet first");
    void run(async () => {
      setPhase("building");
      setMsg(null);
      setHash(null);
      const cpm = stroopsFromXlm(cpmXlm);
      setPhase("signing");
      const res = await createSlot(address, domain, cpm, sign);
      setPhase("success");
      setHash(res.hash);
      setMsg("Ad slot created on-chain.");
      onBalanceRefresh();
    });
  };

  const onFundContract = (e: FormEvent) => {
    e.preventDefault();
    if (!address) return setMsg("Connect wallet first");
    void run(async () => {
      setPhase("building");
      setMsg(null);
      setHash(null);
      const budget = stroopsFromXlm(budgetXlm);
      setPhase("signing");
      setPhase("pending");
      const res = await fundCampaign(
        address,
        Number(slotId),
        budget,
        Number(duration),
        creative,
        sign
      );
      setPhase("success");
      setHash(res.hash);
      setMsg("Campaign budget escrowed in Ad Space contract.");
      onBalanceRefresh();
    });
  };

  /** Level-1 classic XLM transfer to escrow account (optional fallback). */
  const onClassicEscrow = (e: FormEvent) => {
    e.preventDefault();
    if (!address) return setMsg("Connect wallet first");
    if (!ESCROW_ACCOUNT) {
      setPhase("fail");
      setMsg("Set VITE_ESCROW_ACCOUNT for classic escrow transfer demo.");
      return;
    }
    void run(async () => {
      setPhase("building");
      setHash(null);
      const xdr = await buildPaymentXdr(address, ESCROW_ACCOUNT, budgetXlm);
      setPhase("signing");
      const signed = await sign(xdr);
      setPhase("pending");
      const res = await submitClassic(signed);
      setPhase("success");
      setHash(res.hash);
      setMsg(`Classic escrow payment of ${budgetXlm} XLM succeeded.`);
      onBalanceRefresh();
    });
  };

  return (
    <section className="panel" data-tour="advertiser">
      <h2>Advertiser</h2>
      <p className="lead">
        Register a publisher domain slot and escrow micro-XLM campaign budget.
        {AD_SPACE_CONTRACT ? (
          <>
            {" "}
            Contract{" "}
            <a href={EXPERT_CONTRACT(AD_SPACE_CONTRACT)} target="_blank" rel="noreferrer">
              {AD_SPACE_CONTRACT.slice(0, 8)}…
            </a>
          </>
        ) : (
          <span className="hint"> — deploy contracts and set VITE_AD_SPACE_CONTRACT</span>
        )}
      </p>

      <form onSubmit={onCreateSlot}>
        <div className="field">
          <label>Publisher domain</label>
          <input value={domain} onChange={(e) => setDomain(e.target.value)} />
        </div>
        <div className="field">
          <label>CPM (XLM)</label>
          <input value={cpmXlm} onChange={(e) => setCpmXlm(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={!address}>
          Create Ad Slot
        </button>
      </form>

      <form onSubmit={onFundContract} style={{ marginTop: "1.25rem" }}>
        <div className="field">
          <label>Slot ID</label>
          <input value={slotId} onChange={(e) => setSlotId(e.target.value)} />
        </div>
        <div className="field">
          <label>Budget (XLM)</label>
          <input value={budgetXlm} onChange={(e) => setBudgetXlm(e.target.value)} />
        </div>
        <div className="field">
          <label>Duration (seconds)</label>
          <input value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="field">
          <label>Creative URL</label>
          <input value={creative} onChange={(e) => setCreative(e.target.value)} />
        </div>
        <div className="wallet-row">
          <button className="btn" type="submit" disabled={!address || !AD_SPACE_CONTRACT}>
            Fund Campaign Escrow
          </button>
          <button className="btn btn-ghost" type="button" onClick={onClassicEscrow} disabled={!address}>
            Classic XLM Escrow
          </button>
        </div>
      </form>

      <TxStatus phase={phase} message={msg} hash={hash} />

      <p className="hint" style={{ marginTop: "1rem" }}>
        Try invalid domain (spaces), tiny budget + large settle, or short duration to hit
        InvalidPublisherDomain / ExceededCampaignBudget / ExpiredAdDuration.
      </p>
      <button
        className="btn btn-ghost"
        type="button"
        style={{ marginTop: "0.5rem" }}
        onClick={() =>
          address
            ? void fundWithFriendbot(address).then(onBalanceRefresh).catch((e) => {
                setPhase("fail");
                setMsg(e.message);
              })
            : undefined
        }
      >
        Fund wallet via Friendbot
      </button>
    </section>
  );
}
