import { useState } from "react";
import { CpmCalculator } from "../components/CpmCalculator";
import { AdPreview } from "../components/AdPreview";

export function CpmPage() {
  const [creative, setCreative] = useState(
    "https://placehold.co/728x90/e8a317/0c0b09?text=AdPulse"
  );
  const [domain, setDomain] = useState("news.example.com");

  return (
    <section className="panel page-panel">
      <h2>CPM lab</h2>
      <p className="lead">
        Model cost per thousand views, then preview the creative in a publisher
        banner frame.
      </p>

      <div className="grid-2">
        <div>
          <CpmCalculator onPreviewChange={setCreative} />
          <div className="field" style={{ marginTop: "1rem" }}>
            <label>Publisher domain (preview)</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
        </div>
        <AdPreview creativeUrl={creative} domain={domain} />
      </div>
    </section>
  );
}
