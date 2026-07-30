import { useEffect, useState } from "react";
import { useWallet } from "./hooks/useWallet";
import { useBalance } from "./hooks/useBalance";
import { WalletBar } from "./components/WalletBar";
import { AdvertiserPanel } from "./components/AdvertiserPanel";
import { PublisherDashboard } from "./components/PublisherDashboard";
import { OnboardingTour } from "./components/OnboardingTour";
import { fundWithFriendbot } from "./lib/stellar";

type Tab = "advertiser" | "publisher";

export default function App() {
  const { address, connected, connecting, connect, disconnect, sign, error } =
    useWallet();
  const { balance, loading: balLoading, refresh } = useBalance(address);
  const [tab, setTab] = useState<Tab>("advertiser");
  const [runTour, setRunTour] = useState(false);

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
          <button
            type="button"
            className={tab === "advertiser" ? "active" : ""}
            onClick={() => setTab("advertiser")}
          >
            Advertiser
          </button>
          <button
            type="button"
            className={tab === "publisher" ? "active" : ""}
            onClick={() => setTab("publisher")}
          >
            Publisher
          </button>
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

      <header className="hero-block">
        <h1 className="brand">AdPulse</h1>
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
