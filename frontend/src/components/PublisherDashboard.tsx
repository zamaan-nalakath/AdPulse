import { FormEvent, useState } from "react";
import { TxStatus } from "./TxStatus";
import { CpmCalculator } from "./CpmCalculator";
import { AdPreview } from "./AdPreview";
import type { TxPhase } from "../lib/stellar";
import {
  settleImpressions,
  withdrawEarnings,
  readEarnings,
  xlmFromStroops,
  parseContractError,
} from "../lib/contracts";
import { useImpressionEvents } from "../hooks/useImpressionEvents";
import { AD_SPACE_CONTRACT } from "../lib/config";

type Props = {
  address: string | null;
  sign: (xdr: string) => Promise<string>;
};

export function PublisherDashboard({ address, sign }: Props) {
  const [campaignId, setCampaignId] = useState("0");
  const [views, setViews] = useState("1000");
  const [domain, setDomain] = useState("news.example.com");
  const [creative, setCreative] = useState(
    "https://placehold.co/728x90/e8a317/0c0b09?text=AdPulse"
  );
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<string | null>(null);

  const { events, liveEarningsXlm, streaming, error: streamErr } =
    useImpressionEvents(Boolean(AD_SPACE_CONTRACT));

  const refreshEarnings = async () => {
    if (!address || !AD_SPACE_CONTRACT) return;
    try {
      const e = await readEarnings(address);
      setEarnings(xlmFromStroops(e));
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Could not read earnings");
    }
  };

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
        await refreshEarnings();
      } catch (err: unknown) {
        setPhase("fail");
        setMsg(parseContractError(err instanceof Error ? err.message : String(err)));
      }
    })();
  };

  const onWithdraw = () => {
    if (!address) return;
    void (async () => {
      try {
        setPhase("signing");
        setPhase("pending");
        const res = await withdrawEarnings(address, sign);
        setPhase("success");
        setHash(res.hash);
        setMsg("Earnings withdrawn to your wallet.");
        await refreshEarnings();
      } catch (err: unknown) {
        setPhase("fail");
        setMsg(parseContractError(err instanceof Error ? err.message : String(err)));
      }
    })();
  };

  return (
    <section className="panel" data-tour="publisher">
      <h2>Publisher Dashboard</h2>
      <p className="lead">
        Mobile-ready earnings desk with live settlement stream and CPM tools.
      </p>

      <div className="grid-2">
        <div>
          <form onSubmit={onSettle}>
            <div className="field">
              <label>Campaign ID</label>
              <input value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
            </div>
            <div className="field">
              <label>Verified views</label>
              <input value={views} onChange={(e) => setViews(e.target.value)} />
            </div>
            <div className="field">
              <label>Your domain (display)</label>
              <input value={domain} onChange={(e) => setDomain(e.target.value)} />
            </div>
            <div className="wallet-row">
              <button className="btn" type="submit" disabled={!address || !AD_SPACE_CONTRACT}>
                Settle Impressions
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={!address}
                onClick={() => void refreshEarnings()}
              >
                Refresh Earnings
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={!address}
                onClick={onWithdraw}
              >
                Withdraw
              </button>
            </div>
          </form>

          <p className="mono" style={{ marginTop: "1rem" }}>
            On-chain earnings:{" "}
            <span style={{ color: "var(--signal)" }}>
              {earnings ?? liveEarningsXlm ?? "—"} XLM
            </span>
            {streaming ? " · streaming…" : ""}
          </p>
          {streamErr ? <p className="hint">{streamErr}</p> : null}

          <h2 style={{ marginTop: "1.5rem", fontSize: "1.3rem" }}>Live settlements</h2>
          <ul className="event-list" data-tour="events">
            {events.length === 0 ? (
              <li>No ImpressionBatchSettled events yet.</li>
            ) : (
              events.map((ev, i) => (
                <li key={`${ev.ledger}-${i}`}>
                  camp {ev.campaignId} · {ev.views} views · +
                  {xlmFromStroops(BigInt(ev.payoutStroops))} XLM · total{" "}
                  {xlmFromStroops(BigInt(ev.earningsStroops))} XLM
                </li>
              ))
            )}
          </ul>

          <TxStatus phase={phase} message={msg} hash={hash} />
        </div>

        <div>
          <CpmCalculator onPreviewChange={setCreative} />
          <div style={{ marginTop: "1.25rem" }}>
            <AdPreview creativeUrl={creative} domain={domain} />
          </div>
        </div>
      </div>
    </section>
  );
}
