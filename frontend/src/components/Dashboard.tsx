import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useBalance } from "../hooks/useBalance";
import { WalletBar } from "./WalletBar";
import { AdvertiserPanel } from "./AdvertiserPanel";
import { PublisherDashboard } from "./PublisherDashboard";
import { OnboardingTour } from "./OnboardingTour";
import { fundWithFriendbot } from "../lib/stellar";

type Tab = "advertiser" | "publisher";

function tabFromParam(tab?: string): Tab {
  return tab === "publisher" ? "publisher" : "advertiser";
}

export function Dashboard() {
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const { address, connected, connecting, connect, disconnect, sign, error } =
    useWallet();
  const { balance, loading: balLoading, refresh } = useBalance(address);
  const [tab, setTab] = useState<Tab>(() => tabFromParam(tabParam));
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    setTab(tabFromParam(tabParam));
  }, [tabParam]);

  useEffect(() => {
    const seen = localStorage.getItem("adpulse-tour");
    if (!seen) setRunTour(true);
  }, []);

  const finishTour = () => {
    localStorage.setItem("adpulse-tour", "1");
    setRunTour(false);
  };

  return (
    <div className="app-shell">
      <OnboardingTour run={runTour} onDone={finishTour} />
      <nav className="nav">
        <div className="nav-links">
          <Link to="/" className="nav-home">
            AdPulse
          </Link>
          <Link
            to="/app/advertiser"
            className={tab === "advertiser" ? "active" : ""}
            onClick={() => setTab("advertiser")}
          >
            Advertiser
          </Link>
          <Link
            to="/app/publisher"
            className={tab === "publisher" ? "active" : ""}
            onClick={() => setTab("publisher")}
          >
            Publisher
          </Link>
          <button type="button" onClick={() => setRunTour(true)}>
            Tour
          </button>
        </div>
        <WalletBar
          connected={connected}
          connecting={connecting}
          address={address}
          balance={balance}
          balanceLoading={balLoading}
          onConnect={() => void connect()}
          onDisconnect={disconnect}
          onFund={
            address
              ? () => void fundWithFriendbot(address).then(() => refresh())
              : undefined
          }
        />
      </nav>

      <header className="hero-block app-hero">
        <h1 className="brand brand-sm">AdPulse</h1>
        <p className="tagline">
          Open micro-advertising on Stellar — escrow XLM per impression, settle
          verified views, slash fraud on-chain.
        </p>
        {error ? <div className="status fail">{error}</div> : null}
      </header>

      {tab === "advertiser" ? (
        <AdvertiserPanel
          address={address}
          sign={sign}
          onBalanceRefresh={refresh}
        />
      ) : (
        <PublisherDashboard address={address} sign={sign} />
      )}
    </div>
  );
}
