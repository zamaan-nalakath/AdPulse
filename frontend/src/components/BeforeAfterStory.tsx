import { useEffect, useRef, useState } from "react";
import { animate, createTimeline, stagger } from "animejs";

const BEFORE = [
  "Opaque ad networks",
  "Bot fraud eats budget",
  "Delayed payouts",
  "No micro-XLM CPM control",
];

const AFTER = [
  "Escrowed campaigns on-chain",
  "Verified impressions",
  "Anti-fraud slash",
  "Live publisher earnings",
];

export function BeforeAfterStory() {
  const [mode, setMode] = useState<"before" | "after">("before");
  const panelRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLUListElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const entered = useRef(false);
  const busy = useRef(false);

  useEffect(() => {
    const items = itemsRef.current?.querySelectorAll("li");
    if (!items?.length || entered.current) return;
    entered.current = true;
    animate(items, {
      opacity: [0, 1],
      y: [14, 0],
      delay: stagger(70),
      duration: 520,
      ease: "out(3)",
    });
  }, []);

  const switchMode = (next: "before" | "after") => {
    if (next === mode || busy.current) return;
    const panel = panelRef.current;
    const label = labelRef.current;
    const list = itemsRef.current;
    const items = list?.querySelectorAll("li");
    if (!panel || !label || !list || !items?.length) {
      setMode(next);
      return;
    }

    busy.current = true;
    const nextLines = next === "before" ? BEFORE : AFTER;
    const outgoingX = next === "after" ? -18 : 18;
    const incomingX = next === "after" ? 18 : -18;

    const tl = createTimeline({
      defaults: { ease: "out(3)" },
      onComplete: () => {
        busy.current = false;
      },
    });

    tl.add(items, {
      opacity: [1, 0],
      x: [0, outgoingX],
      duration: 280,
      delay: stagger(40),
      onComplete: () => {
        items.forEach((li, i) => {
          li.textContent = nextLines[i] ?? "";
        });
        label.textContent =
          next === "before" ? "Before AdPulse" : "After AdPulse";
        setMode(next);
      },
    })
      .add(label, { opacity: [1, 0], duration: 180 }, "<<=")
      .add(
        panel,
        {
          borderColor:
            next === "after"
              ? "rgba(45, 212, 168, 0.45)"
              : "rgba(232, 93, 76, 0.4)",
          duration: 360,
        },
        "<<"
      )
      .add(label, { opacity: [0, 1], duration: 260 })
      .add(
        items,
        {
          opacity: [0, 1],
          x: [incomingX, 0],
          duration: 420,
          delay: stagger(55),
        },
        "<<"
      );
  };

  return (
    <section className="story-section" aria-labelledby="story-heading">
      <div className="story-copy">
        <p className="eyebrow">Why AdPulse</p>
        <h2 id="story-heading">From opaque spend to verified pulse</h2>
        <p>
          Traditional networks bury fraud and delay payouts. AdPulse escrows XLM,
          settles real impressions, and slashes bots on-chain.
        </p>
        <div className="story-toggle" role="group" aria-label="Before or after AdPulse">
          <button
            type="button"
            className={mode === "before" ? "active" : ""}
            onClick={() => switchMode("before")}
          >
            Before
          </button>
          <button
            type="button"
            className={mode === "after" ? "active" : ""}
            onClick={() => switchMode("after")}
          >
            After
          </button>
        </div>
      </div>

      <div
        ref={panelRef}
        className={`story-panel story-panel--${mode}`}
        data-mode={mode}
      >
        <span ref={labelRef} className="story-mode-label">
          {mode === "before" ? "Before AdPulse" : "After AdPulse"}
        </span>
        <ul ref={itemsRef} className="story-list">
          {(mode === "before" ? BEFORE : AFTER).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
