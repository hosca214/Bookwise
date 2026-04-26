'use client'

import { useEffect, useRef, useState } from "react";

type Tone = "profit" | "tax" | "ops";

interface Props {
  label: string;
  current: number;
  goal: number;
  tone: Tone;
  caption?: string;
  /** When true, animate liquid down to 0 over ~1.4s */
  draining?: boolean;
}

const toneVar: Record<Tone, string> = {
  profit: "var(--color-profit)",
  tax: "var(--color-tax)",
  ops: "var(--color-ops)",
};

export function Reservoir({ label, current, goal, tone, caption, draining = false }: Props) {
  const targetPct = Math.min(100, Math.max(0, (current / Math.max(1, goal)) * 100));
  // animPct drives BOTH liquid position and displayed number/text color flip
  const [animPct, setAnimPct] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Smoothly animate from current animPct to targetPct (or 0 when draining)
    const from = animPct;
    const to = draining ? 0 : targetPct;
    const duration = draining ? 1400 : 1500;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimPct(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPct, draining]);

  const fillOffset = 100 - animPct; // % translateY of the liquid div
  const color = toneVar[tone];

  // Text color flips to white when liquid passes ~50% behind the number.
  // Number sits roughly at vertical center, so threshold ~ 50%.
  const textWhite = animPct >= 50;
  const captionWhite = animPct >= 65;
  const displayedValue = Math.round((animPct / 100) * goal);
  const displayedPct = Math.round(animPct);

  return (
    <div className="flex flex-col items-center gap-3 fade-up">
      <div
        className="relative rounded-full overflow-hidden border-2 shadow-inner"
        style={{
          width: 168,
          height: 168,
          borderColor: "color-mix(in oklab, var(--color-border) 70%, transparent)",
          background: "color-mix(in oklab, var(--color-muted) 60%, transparent)",
        }}
      >
        {/* Liquid */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "100%",
            transform: `translateY(${fillOffset}%)`,
            background: `linear-gradient(180deg, color-mix(in oklab, ${color} 80%, white) 0%, ${color} 100%)`,
            transition: "none",
          }}
        >
          {/* Wave overlay */}
          <div
            className="absolute -top-3 left-0 w-[200%] h-6 liquid-wave"
            style={{
              background: `radial-gradient(ellipse at 25% 100%, ${color} 50%, transparent 51%), radial-gradient(ellipse at 75% 100%, ${color} 50%, transparent 51%)`,
              backgroundSize: "50% 100%",
              backgroundRepeat: "repeat-x",
              opacity: 0.6,
            }}
          />
        </div>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          <span
            className="font-serif leading-none tabular-nums"
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: textWhite ? "#ffffff" : "var(--color-ink)",
              textShadow: textWhite ? "0 1px 3px rgba(0,0,0,0.25)" : "none",
              transition: "color 200ms",
            }}
          >
            {displayedPct}%
          </span>
          <span
            className="text-[15px] mt-1 font-semibold tabular-nums"
            style={{
              color: captionWhite ? "#ffffff" : "var(--color-muted-foreground)",
              transition: "color 200ms",
            }}
          >
            ${displayedValue.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="text-center">
        <h3 className="font-serif text-[22px] font-semibold leading-tight">{label}</h3>
        <p className="text-[15px] text-muted-foreground mt-1">
          Goal ${goal.toLocaleString()}
        </p>
        {caption && <p className="text-[14px] text-muted-foreground mt-1">{caption}</p>}
      </div>
    </div>
  );
}
