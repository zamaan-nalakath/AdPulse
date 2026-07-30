import {
  AD_SPACE_CONTRACT,
  ANTI_FRAUD_CONTRACT,
  EXPERT_CONTRACT,
} from "../lib/config";

const slashPaths = [
  {
    code: "InvalidPublisherDomain",
    detail: "Hostname must include a TLD and contain no spaces.",
  },
  {
    code: "ExceededCampaignBudget",
    detail: "Batch payout would burn more escrow than remaining budget.",
  },
  {
    code: "ExpiredAdDuration",
    detail: "Campaign window closed — settlements after expiry revert.",
  },
  {
    code: "Bot / fraud slash",
    detail:
      "Anti-fraud contract can reject or slash suspicious impression batches before payout.",
  },
] as const;

export function FraudPage() {
  return (
    <section className="panel page-panel" data-tour="fraud">
      <h2>Anti-fraud</h2>
      <p className="lead">
        Inter-contract slash visibility — what reverts, what gets rejected, and
        where to inspect contracts on Testnet.
      </p>

      <ul className="status-chips" style={{ marginBottom: "1.25rem" }}>
        <li className={AD_SPACE_CONTRACT ? "ok" : "warn"}>
          Ad Space {AD_SPACE_CONTRACT ? "linked" : "VITE_AD_SPACE_CONTRACT unset"}
        </li>
        <li className={ANTI_FRAUD_CONTRACT ? "ok" : "warn"}>
          Anti-fraud{" "}
          {ANTI_FRAUD_CONTRACT
            ? "linked"
            : "VITE_ANTI_FRAUD_CONTRACT unset"}
        </li>
      </ul>

      <div className="fraud-contracts mono">
        {AD_SPACE_CONTRACT ? (
          <p>
            Ad Space:{" "}
            <a
              href={EXPERT_CONTRACT(AD_SPACE_CONTRACT)}
              target="_blank"
              rel="noreferrer"
            >
              {AD_SPACE_CONTRACT}
            </a>
          </p>
        ) : null}
        {ANTI_FRAUD_CONTRACT ? (
          <p>
            Anti-fraud:{" "}
            <a
              href={EXPERT_CONTRACT(ANTI_FRAUD_CONTRACT)}
              target="_blank"
              rel="noreferrer"
            >
              {ANTI_FRAUD_CONTRACT}
            </a>
          </p>
        ) : (
          <p className="hint">
            Deploy the anti-fraud contract and set VITE_ANTI_FRAUD_CONTRACT to
            surface slash receipts here.
          </p>
        )}
      </div>

      <h3 className="subhead">Rejection & slash paths</h3>
      <ul className="fraud-list">
        {slashPaths.map((p) => (
          <li key={p.code}>
            <strong>{p.code}</strong>
            <span>{p.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
