import { Link } from "react-router-dom";
import { useAppWallet } from "../context/AppWallet";
import { AD_SPACE_CONTRACT, ANTI_FRAUD_CONTRACT } from "../lib/config";

const hubs = [
  {
    to: "/app/campaigns",
    role: "Advertiser",
    title: "Campaigns",
    blurb: "Escrow XLM budget into live ad campaigns.",
    tour: "hub-campaigns",
  },
  {
    to: "/app/slots",
    role: "Advertiser",
    title: "Ad slots",
    blurb: "Register publisher domains and CPM rates.",
    tour: "hub-slots",
  },
  {
    to: "/app/cpm",
    role: "Advertiser",
    title: "CPM lab",
    blurb: "Model batch cost and preview creatives.",
    tour: "hub-cpm",
  },
  {
    to: "/app/fraud",
    role: "Advertiser",
    title: "Anti-fraud",
    blurb: "Slash visibility and rejection paths.",
    tour: "hub-fraud",
  },
  {
    to: "/app/publisher",
    role: "Publisher",
    title: "Earnings",
    blurb: "On-chain balance, withdraw, live stream.",
    tour: "hub-publisher",
  },
  {
    to: "/app/impressions",
    role: "Publisher",
    title: "Impressions",
    blurb: "Settle verified view batches on-chain.",
    tour: "hub-impressions",
  },
  {
    to: "/app/activity",
    role: "Publisher",
    title: "Activity",
    blurb: "ImpressionBatchSettled event feed.",
    tour: "hub-activity",
  },
] as const;

export function OverviewPage() {
  const { connected, address, balance } = useAppWallet();

  return (
    <div>
      <header className="hero-block app-hero">
        <h1 className="brand brand-sm">Command deck</h1>
        <p className="tagline">
          Open micro-advertising on Stellar — escrow XLM per impression, settle
          verified views, slash fraud on-chain.
        </p>
      </header>

      <section className="panel overview-status">
        <h2>Session</h2>
        <p className="lead">
          {connected && address
            ? `Wallet ${address.slice(0, 4)}…${address.slice(-4)} · ${
                balance != null ? `${Number(balance).toFixed(4)} XLM` : "…"
              }`
            : "Connect a wallet to fund campaigns or settle impressions."}
        </p>
        <ul className="status-chips">
          <li className={AD_SPACE_CONTRACT ? "ok" : "warn"}>
            Ad Space {AD_SPACE_CONTRACT ? "ready" : "unset"}
          </li>
          <li className={ANTI_FRAUD_CONTRACT ? "ok" : "warn"}>
            Anti-fraud {ANTI_FRAUD_CONTRACT ? "ready" : "unset"}
          </li>
        </ul>
      </section>

      <div className="hub-grid" data-tour="hub">
        {hubs.map((h) => (
          <Link key={h.to} to={h.to} className="hub-card" data-tour={h.tour}>
            <span className="hub-role">{h.role}</span>
            <strong>{h.title}</strong>
            <span>{h.blurb}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
