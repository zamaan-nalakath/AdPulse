import { useMemo, useState } from "react";

type Props = {
  defaultCpm?: number;
  onPreviewChange?: (url: string) => void;
};

/** Live CPM calculator + rough cost for impression batches. */
export function CpmCalculator({ defaultCpm = 0.1, onPreviewChange }: Props) {
  const [cpm, setCpm] = useState(String(defaultCpm));
  const [views, setViews] = useState("1000");
  const [budget, setBudget] = useState("5");

  const math = useMemo(() => {
    const c = Number(cpm) || 0;
    const v = Number(views) || 0;
    const b = Number(budget) || 0;
    const cost = (c * v) / 1000;
    const maxViews = c > 0 ? Math.floor((b * 1000) / c) : 0;
    return { cost, maxViews };
  }, [cpm, views, budget]);

  return (
    <div data-tour="cpm">
      <h2>CPM Calculator</h2>
      <p className="lead">Estimate escrow burn from verified views.</p>
      <div className="field">
        <label>CPM (XLM per 1,000 views)</label>
        <input value={cpm} onChange={(e) => setCpm(e.target.value)} inputMode="decimal" />
      </div>
      <div className="field">
        <label>Impression batch</label>
        <input value={views} onChange={(e) => setViews(e.target.value)} inputMode="numeric" />
      </div>
      <div className="field">
        <label>Campaign budget (XLM)</label>
        <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" />
      </div>
      <p className="cpm-readout">{math.cost.toFixed(7)} XLM</p>
      <p className="hint mono">
        Batch cost · max views at budget ≈ {math.maxViews.toLocaleString()}
      </p>
      <div className="field" style={{ marginTop: "1rem" }}>
        <label>Creative URL (preview)</label>
        <input
          placeholder="https://…"
          onChange={(e) => onPreviewChange?.(e.target.value)}
        />
      </div>
    </div>
  );
}
