import { FormEvent, useState } from "react";
import { TxStatus } from "../components/TxStatus";
import type { TxPhase } from "../lib/stellar";
import { fundWithFriendbot } from "../lib/stellar";
import {
  createSlot,
  stroopsFromXlm,
  parseContractError,
} from "../lib/contracts";
import { AD_SPACE_CONTRACT, EXPERT_CONTRACT } from "../lib/config";
import { useAppWallet } from "../context/AppWallet";

export function SlotsPage() {
  const { address, sign, refreshBalance } = useAppWallet();
  const [domain, setDomain] = useState("news.example.com");
  const [cpmXlm, setCpmXlm] = useState("0.1");
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const onCreateSlot = (e: FormEvent) => {
    e.preventDefault();
    if (!address) {
      setMsg("Connect wallet first");
      return;
    }
    void (async () => {
      try {
        setPhase("building");
        setMsg(null);
        setHash(null);
        const cpm = stroopsFromXlm(cpmXlm);
        setPhase("signing");
        const res = await createSlot(address, domain, cpm, sign);
        setPhase("success");
        setHash(res.hash);
        setMsg("Ad slot created on-chain.");
        refreshBalance();
      } catch (err: unknown) {
        setPhase("fail");
        setMsg(
          parseContractError(err instanceof Error ? err.message : String(err))
        );
      }
    })();
  };

  return (
    <section className="panel page-panel" data-tour="slots">
      <h2>Ad slots</h2>
      <p className="lead">
        Register a publisher domain and CPM rate on the Ad Space contract.
        {AD_SPACE_CONTRACT ? (
          <>
            {" "}
            Contract{" "}
            <a
              href={EXPERT_CONTRACT(AD_SPACE_CONTRACT)}
              target="_blank"
              rel="noreferrer"
            >
              {AD_SPACE_CONTRACT.slice(0, 8)}…
            </a>
          </>
        ) : (
          <span className="hint">
            {" "}
            — deploy contracts and set VITE_AD_SPACE_CONTRACT
          </span>
        )}
      </p>

      <form onSubmit={onCreateSlot} className="form-narrow">
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

      <TxStatus phase={phase} message={msg} hash={hash} />

      <p className="hint" style={{ marginTop: "1rem" }}>
        Invalid domains (spaces, missing TLD) surface as InvalidPublisherDomain.
      </p>
      <button
        className="btn btn-ghost"
        type="button"
        style={{ marginTop: "0.5rem" }}
        onClick={() =>
          address
            ? void fundWithFriendbot(address)
                .then(refreshBalance)
                .catch((err: Error) => {
                  setPhase("fail");
                  setMsg(err.message);
                })
            : undefined
        }
      >
        Fund wallet via Friendbot
      </button>
    </section>
  );
}
