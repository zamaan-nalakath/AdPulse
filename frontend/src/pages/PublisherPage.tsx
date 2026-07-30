import { useState } from "react";
import { Link } from "react-router-dom";
import { TxStatus } from "../components/TxStatus";
import type { TxPhase } from "../lib/stellar";
import {
  withdrawEarnings,
  readEarnings,
  xlmFromStroops,
  parseContractError,
} from "../lib/contracts";
import { useImpressionEvents } from "../hooks/useImpressionEvents";
import { AD_SPACE_CONTRACT } from "../lib/config";
import { useAppWallet } from "../context/AppWallet";

export function PublisherPage() {
  const { address, sign } = useAppWallet();
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<string | null>(null);

  const { liveEarningsXlm, streaming, error: streamErr } = useImpressionEvents(
    Boolean(AD_SPACE_CONTRACT)
  );

  const refreshEarnings = async () => {
    if (!address || !AD_SPACE_CONTRACT) return;
    try {
      const e = await readEarnings(address);
      setEarnings(xlmFromStroops(e));
      setMsg(null);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Could not read earnings");
    }
  };

  const onWithdraw = () => {
    if (!address) return;
    void (async () => {
      try {
        setPhase("signing");
        setPhase("pending");
        setHash(null);
        const res = await withdrawEarnings(address, sign);
        setPhase("success");
        setHash(res.hash);
        setMsg("Earnings withdrawn to your wallet.");
        await refreshEarnings();
      } catch (err: unknown) {
        setPhase("fail");
        setMsg(
          parseContractError(err instanceof Error ? err.message : String(err))
        );
      }
    })();
  };

  return (
    <section className="panel page-panel" data-tour="publisher">
      <h2>Publisher earnings</h2>
      <p className="lead">
        Live desk for on-chain balance. Settle batches on{" "}
        <Link to="/app/impressions">Impressions</Link>, watch the feed on{" "}
        <Link to="/app/activity">Activity</Link>.
      </p>

      <p className="earnings-readout mono">
        On-chain earnings:{" "}
        <span style={{ color: "var(--signal)" }}>
          {earnings ?? liveEarningsXlm ?? "—"} XLM
        </span>
        {streaming ? " · streaming…" : ""}
      </p>
      {streamErr ? <p className="hint">{streamErr}</p> : null}

      <div className="wallet-row" style={{ marginTop: "1.25rem" }}>
        <button
          className="btn"
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
        <Link to="/app/impressions" className="btn btn-ghost">
          Settle batch
        </Link>
      </div>

      <TxStatus phase={phase} message={msg} hash={hash} />
    </section>
  );
}
