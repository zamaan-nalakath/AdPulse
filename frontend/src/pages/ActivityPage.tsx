import { useImpressionEvents } from "../hooks/useImpressionEvents";
import { xlmFromStroops } from "../lib/contracts";
import { AD_SPACE_CONTRACT } from "../lib/config";

export function ActivityPage() {
  const { events, streaming, error, refresh } = useImpressionEvents(
    Boolean(AD_SPACE_CONTRACT)
  );

  return (
    <section className="panel page-panel" data-tour="activity">
      <h2>Activity feed</h2>
      <p className="lead">
        Live ImpressionBatchSettled events from the Ad Space contract
        {streaming ? " · polling…" : ""}.
      </p>

      <div className="wallet-row" style={{ marginBottom: "1rem" }}>
        <button className="btn btn-ghost" type="button" onClick={() => void refresh()}>
          Refresh feed
        </button>
      </div>

      {error ? <p className="hint">{error}</p> : null}

      <ul className="event-list event-list--tall" data-tour="events">
        {events.length === 0 ? (
          <li>No ImpressionBatchSettled events yet.</li>
        ) : (
          events.map((ev, i) => (
            <li key={`${ev.ledger}-${i}`}>
              camp {ev.campaignId} · {ev.views} views · +
              {xlmFromStroops(BigInt(ev.payoutStroops))} XLM · total{" "}
              {xlmFromStroops(BigInt(ev.earningsStroops))} XLM
              {ev.publisher ? (
                <span className="hint"> · {ev.publisher.slice(0, 4)}…</span>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
