import { FormEvent, useState } from "react";
import { TxStatus } from "../components/TxStatus";
import type { TxPhase } from "../lib/stellar";
import { settleImpressions, parseContractError } from "../lib/contracts";
import { AD_SPACE_CONTRACT } from "../lib/config";
import { useAppWallet } from "../context/AppWallet";

export function ImpressionsPage() {
  const { address, sign } = useAppWallet();
  const [campaignId, setCampaignId] = useState("0");
  const [views, setViews] = useState("1000");
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const onSettle = (e: FormEvent) => {
    e.preventDefault();
    if (!address) {
      setMsg("Connect wallet first");
      return;
    }
    void (async () => {
      try {
        setPhase("building");
        setHash(null);
        setMsg(null);
        setPhase("signing");
        setPhase("pending");
        const res = await settleImpressions(
          address,
          Number(campaignId),
          Number(views),
          sign
        );
        setPhase("success");
        setHash(res.hash);
        setMsg("Impression batch settled — earnings updated.");
      } catch (err: unknown) {
        setPhase("fail");
        setMsg(
          parseContractError(err instanceof Error ? err.message : String(err))
        );
      }
    })();
  };

  return (
    <section className="panel page-panel" data-tour="impressions">
      <h2>Settle impressions</h2>
      <p className="lead">
        Submit a verified view batch. Anti-fraud can reject bots before payout.
      </p>

      <form onSubmit={onSettle} className="form-narrow">
        <div className="field">
          <label>Campaign ID</label>
          <input
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Verified views</label>
          <input value={views} onChange={(e) => setViews(e.target.value)} />
        </div>
        <button
          className="btn"
          type="submit"
          disabled={!address || !AD_SPACE_CONTRACT}
        >
          Settle Impressions
        </button>
      </form>

      <TxStatus phase={phase} message={msg} hash={hash} />
    </section>
  );
}
