import { useCallback, useEffect, useState } from "react";
import { getXlmBalance } from "../lib/stellar";

export function useBalance(address: string | null) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const b = await getXlmBalance(address);
      setBalance(b);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch balance");
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
    if (!address) return;
    const id = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(id);
  }, [address, refresh]);

  return { balance, loading, error, refresh };
}
