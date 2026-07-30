import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { TxStatus } from "../components/TxStatus";
import type { TxPhase } from "../lib/stellar";
import { buildPaymentXdr, submitClassic } from "../lib/stellar";
import {
  fundCampaign,
  stroopsFromXlm,
  parseContractError,
} from "../lib/contracts";
import {
  ESCROW_ACCOUNT,
  AD_SPACE_CONTRACT,
  EXPERT_CONTRACT,
} from "../lib/config";
import { useAppWallet } from "../context/AppWallet";

export function CampaignsPage() {
  const { address, sign, refreshBalance } = useAppWallet();
  const [budgetXlm, setBudgetXlm] = useState("2");
  const [duration, setDuration] = useState("86400");
  const [creative, setCreative] = useState(
    "https://placehold.co/728x90/e8a317/0c0b09?text=AdPulse"
  );
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

  const onFundContract = (e: FormEvent) => {
    e.preventDefault();
    if (!address) {
      setMsg("Connect wallet first");
      return;
    }
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
      refreshBalance();
    });
  };

  const onClassicEscrow = (e: FormEvent) => {
    e.preventDefault();
    if (!address) {
      setMsg("Connect wallet first");
      return;
    }
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
      refreshBalance();
    });
  };

  return (
    <section className="panel page-panel" data-tour="advertiser">
      <h2>Campaigns</h2>
      <p className="lead">
        Escrow micro-XLM into a slot. Create a slot first on{" "}
        <Link to="/app/slots">Ad slots</Link>
        {AD_SPACE_CONTRACT ? (
          <>
            {" "}
            ·{" "}
            <a
              href={EXPERT_CONTRACT(AD_SPACE_CONTRACT)}
              target="_blank"
              rel="noreferrer"
            >
              contract
            </a>
          </>
        ) : null}
        .
      </p>

      <form onSubmit={onFundContract} className="form-narrow">
        <div className="field">
          <label>Slot ID</label>
          <input value={slotId} onChange={(e) => setSlotId(e.target.value)} />
        </div>
        <div className="field">
          <label>Budget (XLM)</label>
          <input
            value={budgetXlm}
            onChange={(e) => setBudgetXlm(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Duration (seconds)</label>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Creative URL</label>
          <input
            value={creative}
            onChange={(e) => setCreative(e.target.value)}
          />
        </div>
        <div className="wallet-row">
          <button
            className="btn"
            type="submit"
            disabled={!address || !AD_SPACE_CONTRACT}
          >
            Fund Campaign Escrow
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={onClassicEscrow}
            disabled={!address}
          >
            Classic XLM Escrow
          </button>
        </div>
      </form>

      <TxStatus phase={phase} message={msg} hash={hash} />

      <p className="hint" style={{ marginTop: "1rem" }}>
        Tiny budget + large settle, or short duration, hits ExceededCampaignBudget
        / ExpiredAdDuration.
      </p>
    </section>
  );
}
