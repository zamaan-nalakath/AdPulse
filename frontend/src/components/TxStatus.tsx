import type { TxPhase } from "../lib/stellar";
import { EXPERT_TX } from "../lib/config";

type Props = {
  phase: TxPhase;
  message?: string | null;
  hash?: string | null;
};

export function TxStatus({ phase, message, hash }: Props) {
  if (phase === "idle" && !message) return null;
  const cls =
    phase === "success"
      ? "success"
      : phase === "fail"
        ? "fail"
        : phase === "pending" || phase === "signing" || phase === "building"
          ? "pending"
          : "";

  const label =
    phase === "building"
      ? "Building transaction…"
      : phase === "signing"
        ? "Awaiting wallet signature…"
        : phase === "pending"
          ? "Pending confirmation…"
          : phase === "success"
            ? "Success"
            : phase === "fail"
              ? "Failed"
              : "Status";

  return (
    <div className={`status ${cls}`} data-tour="tx-status" role="status">
      <strong>{label}</strong>
      {message ? <div>{message}</div> : null}
      {hash ? (
        <div>
          Tx:{" "}
          <a href={EXPERT_TX(hash)} target="_blank" rel="noreferrer">
            {hash.slice(0, 10)}…{hash.slice(-6)}
          </a>
        </div>
      ) : null}
    </div>
  );
}
