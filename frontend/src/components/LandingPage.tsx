import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { animate, createTimeline, stagger } from "animejs";
import { SignalOrb } from "./SignalOrb";
import { BeforeAfterStory } from "./BeforeAfterStory";

export function LandingPage() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const brand = root.querySelector(".landing-brand");
    const line = root.querySelector(".landing-line");
    const sub = root.querySelector(".landing-sub");
    const ctas = root.querySelectorAll(".landing-cta .btn");
    const orb = root.querySelector(".landing-orb");
    if (!brand || !line || !sub || !orb || ctas.length === 0) return;

    const tl = createTimeline({ defaults: { ease: "out(3)" } });
    tl.add(brand, {
      opacity: [0, 1],
      y: [28, 0],
      letterSpacing: ["0.22em", "0.06em"],
      duration: 900,
    })
      .add(line, { opacity: [0, 1], y: [16, 0], duration: 620 }, "-=480")
      .add(sub, { opacity: [0, 1], y: [12, 0], duration: 560 }, "-=360")
      .add(
        ctas,
        { opacity: [0, 1], y: [10, 0], duration: 480, delay: stagger(90) },
        "-=320"
      )
      .add(orb, { opacity: [0, 1], scale: [0.92, 1], duration: 900 }, 180);

    const beams = root.querySelectorAll(".landing-beam");
    if (beams.length) {
      animate(beams, {
        opacity: [0.15, 0.55, 0.15],
        duration: 4200,
        loop: true,
        delay: stagger(700),
        ease: "inOut(2)",
      });
    }

    return () => {
      tl.pause();
    };
  }, []);

  return (
    <main ref={rootRef} className="landing">
      <header className="landing-nav">
        <Link to="/" className="landing-nav-brand">
          AdPulse
        </Link>
        <div className="landing-nav-links">
          <Link to="/app/advertiser">Campaigns</Link>
          <Link to="/app/publisher">Publish</Link>
          <Link to="/app" className="btn landing-nav-cta">
            Open app
          </Link>
        </div>
      </header>

      <section className="landing-hero" aria-label="AdPulse hero">
        <div className="landing-hero-atmosphere" aria-hidden="true">
          <span className="landing-beam landing-beam--a" />
          <span className="landing-beam landing-beam--b" />
          <span className="landing-beam landing-beam--c" />
          <div className="landing-grid" />
        </div>

        <div className="landing-hero-copy">
          <h1 className="landing-brand">AdPulse</h1>
          <p className="landing-line">Micro-ads that settle in XLM.</p>
          <p className="landing-sub">
            Escrow campaigns, verify impressions, slash fraud — live publisher
            earnings on Stellar.
          </p>
          <div className="landing-cta">
            <Link to="/app/advertiser" className="btn">
              Fund a campaign
            </Link>
            <Link to="/app/publisher" className="btn btn-ghost">
              Publisher dashboard
            </Link>
          </div>
        </div>

        <div className="landing-orb-wrap">
          <SignalOrb className="landing-orb" size={320} speed={1.05} />
          <p className="landing-orb-caption mono">impression signal · live verify</p>
        </div>
      </section>

      <BeforeAfterStory />

      <section className="landing-flow" aria-labelledby="flow-heading">
        <p className="eyebrow">How it works</p>
        <h2 id="flow-heading">Escrow. Verify. Settle.</h2>
        <ol className="flow-steps">
          <li>
            <span className="flow-num">01</span>
            <strong>Escrow XLM</strong>
            <span>Advertisers lock budget per slot with micro-CPM control.</span>
          </li>
          <li>
            <span className="flow-num">02</span>
            <strong>Verify views</strong>
            <span>Publishers settle impression batches; bots get slashed.</span>
          </li>
          <li>
            <span className="flow-num">03</span>
            <strong>Earn live</strong>
            <span>Earnings stream from on-chain events — no waiting weeks.</span>
          </li>
        </ol>
      </section>

      <section className="landing-final">
        <h2>Run the pulse on Testnet</h2>
        <p>Connect Freighter, fund a campaign, settle verified impressions.</p>
        <div className="landing-cta">
          <Link to="/app" className="btn">
            Enter AdPulse
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span>AdPulse · Stellar Build Station</span>
        <span className="mono">Soroban · Testnet</span>
      </footer>
    </main>
  );
}
