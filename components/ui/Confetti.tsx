import { useEffect, useState } from "react";

interface Piece {
  id: number;
  tx: string;
  ty: string;
  r: string;
  color: string;
  delay: string;
}

export function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const colors = [
      "var(--color-primary)",
      "var(--color-accent)",
      "var(--color-profit)",
      "var(--color-tax)",
      "var(--color-ops)",
    ];
    const next: Piece[] = Array.from({ length: 60 }).map((_, i) => ({
      id: trigger * 1000 + i,
      tx: `${(Math.random() - 0.5) * 600}px`,
      ty: `${-200 - Math.random() * 300}px`,
      r: `${(Math.random() - 0.5) * 720}deg`,
      color: colors[i % colors.length],
      delay: `${Math.random() * 0.1}s`,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 1400);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!pieces.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="absolute left-1/2 top-1/2">
        {pieces.map((p) => (
          <span
            key={p.id}
            style={{
              position: "absolute",
              width: 10,
              height: 14,
              borderRadius: 2,
              background: p.color,
              ["--tx" as string]: p.tx,
              ["--ty" as string]: p.ty,
              ["--r" as string]: p.r,
              animation: `confettiPop 1.2s cubic-bezier(0.2,0.7,0.3,1) ${p.delay} forwards`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
