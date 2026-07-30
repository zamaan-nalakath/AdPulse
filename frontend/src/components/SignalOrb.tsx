import { useEffect, useRef } from "react";

/**
 * Dotted signal orb — inspired by thinking-orbs (Jakub Antalik):
 * Fibonacci-style tilted orbits, depth-sorted 2D canvas dots, no WebGL.
 * Tuned for AdPulse amber / signal palette on dark media surfaces.
 */

type Dot = { x: number; y: number; z: number; r: number; a: number; hue: "amber" | "signal" | "ghost" };

function hashD(a: number, b: number): number {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

function makeProj(yaw: number, tilt: number, cx: number, cy: number) {
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  const sy = Math.sin(yaw);
  const cyw = Math.cos(yaw);
  return (x: number, y: number, z: number): [number, number, number] => {
    const x1 = x * cyw + z * sy;
    const z1 = -x * sy + z * cyw;
    const y1 = y * ct - z1 * st;
    const z2 = y * st + z1 * ct;
    return [cx + x1, cy - y1, z2];
  };
}

type Props = {
  size?: number;
  className?: string;
  speed?: number;
};

export function SignalOrb({ size = 280, className, speed = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rs = (size / 300) ** 0.55;
    const orbitN = 10;
    const ghostN = 36;
    const particles = 3;

    const frame = (tSec: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const R = (size / 2) * 0.84;
      const pt = makeProj(tSec * 0.11, 0.32, cx, cy);
      const dots: Dot[] = [];

      for (let orb = 0; orb < orbitN; orb++) {
        const h1 = hashD(orb, 1.7);
        const h2 = hashD(orb, 5.2);
        const h3 = hashD(orb, 8.9);
        const ro = R * (0.42 + 0.55 * h1);
        const th = h1 * 2 * Math.PI;
        const phi = Math.acos(2 * h2 - 1);
        const nx = Math.sin(phi) * Math.cos(th);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(th);
        let ux = -ny;
        let uy = nx;
        const uz = 0;
        const ul = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy));
        ux /= ul;
        uy /= ul;
        const vx = ny * uz - nz * uy;
        const vy = nz * ux - nx * uz;
        const vz = nx * uy - ny * ux;
        const spd = (0.22 + 0.5 * h3) * (h3 > 0.5 ? 1 : -1);

        for (let k = 0; k < ghostN; k++) {
          const a = (k / ghostN) * 2 * Math.PI;
          const [px, py, z] = pt(
            (ux * Math.cos(a) + vx * Math.sin(a)) * ro,
            (uy * Math.cos(a) + vy * Math.sin(a)) * ro,
            (uz * Math.cos(a) + vz * Math.sin(a)) * ro
          );
          const depth = (z / ro + 1) / 2;
          dots.push({
            x: px,
            y: py,
            z,
            r: 0.85 * rs,
            a: 0.22 * (0.35 + 0.65 * depth),
            hue: "ghost",
          });
        }

        for (let m = 0; m < particles; m++) {
          const a = tSec * spd + (m / particles) * 2 * Math.PI + h2 * 6;
          const [px, py, z] = pt(
            (ux * Math.cos(a) + vx * Math.sin(a)) * ro,
            (uy * Math.cos(a) + vy * Math.sin(a)) * ro,
            (uz * Math.cos(a) + vz * Math.sin(a)) * ro
          );
          const depth = (z / ro + 1) / 2;
          dots.push({
            x: px,
            y: py,
            z,
            r: (1.15 + 1.5 * depth) * rs,
            a: 0.55 + 0.4 * depth,
            hue: orb % 3 === 0 ? "signal" : "amber",
          });
        }
      }

      dots.sort((a, b) => a.z - b.z);
      for (const d of dots) {
        if (d.a < 0.02) continue;
        if (d.hue === "amber") {
          ctx.fillStyle = `rgba(232, 163, 23, ${d.a})`;
        } else if (d.hue === "signal") {
          ctx.fillStyle = `rgba(45, 212, 168, ${d.a})`;
        } else {
          ctx.fillStyle = `rgba(232, 224, 208, ${d.a})`;
        }
        ctx.beginPath();
        ctx.arc(d.x, d.y, Math.max(0.35, d.r), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (reduced) {
      frame(0.7);
      return;
    }

    let raf = 0;
    let running = false;
    const loop = () => {
      frame((performance.now() / 1000) * speed);
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    frame((performance.now() / 1000) * speed);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && document.visibilityState !== "hidden") start();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => {
      if (document.visibilityState === "hidden") stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [size, speed]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: size, height: size, display: "block" }}
      role="img"
      aria-label="AdPulse signal orb — impression verification visualization"
    />
  );
}
