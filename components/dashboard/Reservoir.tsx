'use client'

import { useEffect, useRef, useState } from "react";

type Tone = "profit" | "tax" | "ops";

interface Props {
  label: string;
  current: number;
  goal: number;
  tone: Tone;
  caption?: string;
  draining?: boolean;
}

const toneVar: Record<Tone, string> = {
  profit: "var(--color-profit)",
  tax: "var(--color-tax)",
  ops: "var(--color-ops)",
};

export function Reservoir({ label, current, goal, tone, caption, draining = false }: Props) {
  const targetPct = Math.min(100, Math.max(0, (current / Math.max(1, goal)) * 100));
  const [animPct, setAnimPct] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = animPct;
    const to = draining ? 0 : targetPct;
    const duration = draining ? 1400 : 1500;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
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

  const fillOffset = 100 - animPct;
  const color = toneVar[tone];
  const textWhite = animPct >= 50;
  const captionWhite = animPct >= 65;
  const displayedValue = Math.round((animPct / 100) * goal);
  const displayedPct = Math.round(animPct);

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          position: 'relative',
          width: 168,
          height: 168,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid color-mix(in oklab, var(--color-border) 70%, transparent)',
          background: 'color-mix(in oklab, var(--color-muted) 60%, transparent)',
          boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
        }}
      >
        {/* Liquid */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '100%',
            transform: `translateY(${fillOffset}%)`,
            background: `linear-gradient(180deg, color-mix(in oklab, ${color} 80%, white) 0%, ${color} 100%)`,
            transition: 'none',
          }}
        >
          {/* Wave overlay */}
          <div
            className="liquid-wave"
            style={{
              position: 'absolute',
              top: -12,
              left: 0,
              width: '200%',
              height: 24,
              background: `radial-gradient(ellipse at 25% 100%, ${color} 50%, transparent 51%), radial-gradient(ellipse at 75% 100%, ${color} 50%, transparent 51%)`,
              backgroundSize: '50% 100%',
              backgroundRepeat: 'repeat-x',
              opacity: 0.6,
            }}
          />
        </div>

        {/* Center text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 8px',
          }}
        >
          <span
            className="font-serif"
            style={{
              fontSize: 38,
              fontWeight: 800,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              color: textWhite ? '#ffffff' : 'var(--color-ink)',
              textShadow: textWhite ? '0 1px 3px rgba(0,0,0,0.25)' : 'none',
              transition: 'color 200ms',
            }}
          >
            {displayedPct}%
          </span>
          <span
            style={{
              fontSize: 15,
              marginTop: 4,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              color: captionWhite ? '#ffffff' : 'var(--color-muted-foreground)',
              transition: 'color 200ms',
            }}
          >
            ${displayedValue.toLocaleString()}
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, margin: 0 }}>{label}</h3>
        <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', margin: '4px 0 0' }}>
          Goal ${goal.toLocaleString()}
        </p>
        {caption && <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: '4px 0 0' }}>{caption}</p>}
      </div>
    </div>
  );
}
