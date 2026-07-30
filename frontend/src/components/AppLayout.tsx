import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useBalance } from "../hooks/useBalance";
import { fundWithFriendbot } from "../lib/stellar";
import { AppWalletProvider } from "../context/AppWallet";
import { WalletBar } from "./WalletBar";
import { OnboardingTour } from "./OnboardingTour";

const advertiserLinks = [
  { to: "/app/campaigns", label: "Campaigns", tour: "nav-campaigns" },
  { to: "/app/slots", label: "Slots", tour: "nav-slots" },
  { to: "/app/cpm", label: "CPM", tour: "nav-cpm" },
  { to: "/app/fraud", label: "Fraud", tour: "nav-fraud" },
] as const;

const publisherLinks = [
  { to: "/app/publisher", label: "Earnings", tour: "nav-publisher" },
  { to: "/app/impressions", label: "Impressions", tour: "nav-impressions" },
  { to: "/app/activity", label: "Activity", tour: "nav-activity" },
] as const;

export function AppLayout() {
  const location = useLocation();
  const { address, connected, connecting, connect, disconnect, sign, error } =
    useWallet();
  const { balance, loading: balLoading, refresh } = useBalance(address);
  const [runTour, setRunTour] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("adpulse-tour");
    if (!seen) setRunTour(true);
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const finishTour = () => {
    localStorage.setItem("adpulse-tour", "1");
    setRunTour(false);
  };

  const wallet = useMemo(
    () => ({
      address,
      connected,
      connecting,
      connect,
      disconnect,
      sign,
      error,
      balance,
      balanceLoading: balLoading,
      refreshBalance: refresh,
    }),
    [
      address,
      connected,
      connecting,
      connect,
      disconnect,
      sign,
      error,
      balance,
      balLoading,
      refresh,
    ]
  );

  return (
    <AppWalletProvider value={wallet}>
      <div className="app-shell">
        <OnboardingTour run={runTour} onDone={finishTour} />

        <nav className="nav app-nav" data-tour="nav">
          <div className="nav-brand-row">
            <Link to="/" className="nav-home">
              AdPulse
            </Link>
            <button
              type="button"
              className="nav-menu-toggle"
              aria-expanded={navOpen}
              aria-controls="app-nav-drawer"
              onClick={() => setNavOpen((o) => !o)}
            >
              {navOpen ? "Close" : "Menu"}
            </button>
          </div>

          <div
            id="app-nav-drawer"
            className={`nav-drawer ${navOpen ? "open" : ""}`}
          >
            <div className="nav-links">
              <NavLink to="/app" end className="nav-hub" data-tour="nav-hub">
                Overview
              </NavLink>

              <div className="nav-group" data-tour="advertiser">
                <span className="nav-section-label">Advertiser</span>
                {advertiserLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    data-tour={l.tour}
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>

              <div className="nav-group" data-tour="publisher-nav">
                <span className="nav-section-label">Publisher</span>
                {publisherLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    data-tour={l.tour}
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>

              <button type="button" onClick={() => setRunTour(true)}>
                Tour
              </button>
            </div>
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

        {error ? <div className="status fail">{error}</div> : null}

        <Outlet />
      </div>
    </AppWalletProvider>
  );
}
