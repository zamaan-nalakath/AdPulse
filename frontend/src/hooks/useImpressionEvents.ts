import { useCallback, useEffect, useRef, useState } from "react";
import { rpc, StellarSdk } from "../lib/stellar";
import { AD_SPACE_CONTRACT } from "../lib/config";
import { xlmFromStroops } from "../lib/contracts";

export type SettlementEvent = {
  campaignId: string;
  publisher: string;
  views: number;
  payoutStroops: string;
  earningsStroops: string;
  ledger: number;
  at: number;
};

/**
 * Polls Soroban RPC getEvents for ImpressionBatchSettled (topic imp_settl).
 */
export function useImpressionEvents(enabled: boolean) {
  const [events, setEvents] = useState<SettlementEvent[]>([]);
  const [liveEarningsXlm, setLiveEarningsXlm] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | undefined>(undefined);

  const poll = useCallback(async () => {
    if (!AD_SPACE_CONTRACT) return;
    setStreaming(true);
    try {
      const startLedger = Math.max(
        1,
        (await rpc.getLatestLedger()).sequence - 2000
      );
      const res = await rpc.getEvents({
        startLedger: cursorRef.current ? undefined : startLedger,
        cursor: cursorRef.current,
        filters: [
          {
            type: "contract",
            contractIds: [AD_SPACE_CONTRACT],
            topics: [["*", "*"]],
          },
        ],
        limit: 50,
      });

      cursorRef.current = res.cursor;
      const parsed: SettlementEvent[] = [];
      for (const ev of res.events) {
        try {
          const topics = ev.topic.map((t) => {
            try {
              return StellarSdk.scValToNative(t);
            } catch {
              return null;
            }
          });
          const topic0 = String(topics[0] ?? "");
          if (!topic0.includes("imp_settl") && topic0 !== "imp_settl") continue;
          const data = StellarSdk.scValToNative(ev.value);
          // data: (publisher, view_count, payout, earnings)
          const arr = Array.isArray(data) ? data : [data];
          const publisher = String(arr[0] ?? "");
          const views = Number(arr[1] ?? 0);
          const payout = String(arr[2] ?? "0");
          const earnings = String(arr[3] ?? "0");
          parsed.push({
            campaignId: String(topics[1] ?? ""),
            publisher,
            views,
            payoutStroops: payout,
            earningsStroops: earnings,
            ledger: ev.ledger,
            at: Date.now(),
          });
          setLiveEarningsXlm(xlmFromStroops(BigInt(earnings)));
        } catch {
          /* skip malformed */
        }
      }
      if (parsed.length) {
        setEvents((prev) => [...parsed.reverse(), ...prev].slice(0, 40));
      }
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Event stream error");
    } finally {
      setStreaming(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !AD_SPACE_CONTRACT) return;
    void poll();
    const id = window.setInterval(() => void poll(), 8_000);
    return () => window.clearInterval(id);
  }, [enabled, poll]);

  return { events, liveEarningsXlm, streaming, error, refresh: poll };
}
