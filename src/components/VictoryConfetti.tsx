import React, { useMemo } from 'react';

const CONFETTI_COLORS = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#f59e0b'];

interface ConfettiPiece {
  id: number;
  leftPct: number;
  color: string;
  durationSec: number;
  delaySec: number;
  widthPx: number;
  heightPx: number;
}

export const VictoryConfetti: React.FC<{ active?: boolean }> = ({
  active = true,
}) => {
  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: 36 }).map((_, idx) => ({
      id: idx,
      leftPct: (idx * 29 + 7) % 98,
      color: CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
      durationSec: 1.9 + (idx % 5) * 0.25,
      delaySec: (idx % 7) * 0.12,
      widthPx: idx % 2 === 0 ? 8 : 6,
      heightPx: idx % 3 === 0 ? 14 : 10,
    }));
  }, []);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="animate-confetti absolute top-0 rounded-[2px]"
          style={
            {
              left: `${p.leftPct}%`,
              width: `${p.widthPx}px`,
              height: `${p.heightPx}px`,
              backgroundColor: p.color,
              '--fall-duration': `${p.durationSec}s`,
              '--fall-delay': `${p.delaySec}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
