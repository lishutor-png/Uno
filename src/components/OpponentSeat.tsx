import React from 'react';
import { Player, PlayerSummary } from '../engine/types';
import { DIFFICULTY_LABELS_ID } from '../utilities/cardHelpers';
import { UnoCard } from './UnoCard';

export type OpponentViewModel = (Player | PlayerSummary) & {
  connected?: boolean;
};

interface OpponentSeatProps {
  player: OpponentViewModel;
  isCurrentTurn: boolean;
  canCatchUno: boolean;
  onCatchUno: (playerId: string) => void;
  compact?: boolean;
}

/**
 * Seated opponent across the far edge of the front-perspective UNO Arena table.
 * Active player receives golden spotlight & highlight; inactive seats recede softly.
 */
export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  isCurrentTurn,
  canCatchUno,
  onCatchUno,
  compact = false,
}) => {
  const cardCount = 'hand' in player ? player.hand.length : player.cardCount;
  const visibleBackCount = Math.min(cardCount, compact ? 3 : 5);
  const isDisconnected = player.connected === false;
  const initials = player.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`relative flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 transition-all duration-200 shrink-0 ${
        isCurrentTurn
          ? 'bg-gradient-to-b from-[#134e35] to-[#072619] ring-2 ring-amber-400 shadow-[0_10px_28px_rgba(251,191,36,0.4)] scale-[1.04] z-10'
          : 'bg-black/50 border border-white/10 opacity-85 scale-[0.96]'
      } ${isDisconnected ? 'opacity-50' : ''}`}
    >
      {/* Active player spotlight glow */}
      {isCurrentTurn && (
        <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-amber-400/15 blur-sm" />
      )}

      {/* Avatar + Name + Card Count */}
      <div className="relative flex items-center gap-2 min-w-0">
        <div
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-display font-extrabold text-slate-950 shrink-0 shadow-md border-2 ${
            isCurrentTurn ? 'border-amber-300' : 'border-white/50'
          }`}
          style={{ backgroundColor: player.avatarColor }}
        >
          {initials}
        </div>

        <div className="flex flex-col min-w-0 leading-tight">
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[82px] sm:max-w-[110px]">
              {player.name}
            </span>
            {isCurrentTurn && (
              <span className="text-[11px] font-bold text-amber-300 whitespace-nowrap">
                · Giliran
              </span>
            )}
          </div>
          <span className="text-[11px] sm:text-xs text-emerald-100/85 tabular-nums whitespace-nowrap">
            {cardCount} kartu
            {player.botDifficulty
              ? ` · ${DIFFICULTY_LABELS_ID[player.botDifficulty]}`
              : isDisconnected
                ? ' · Putus'
                : ''}
          </span>
        </div>
      </div>

      {/* Closed UNO cards held by opponent across the table */}
      <div className="relative flex items-center justify-center h-9 sm:h-11 mt-0.5">
        {Array.from({ length: visibleBackCount }).map((_, idx) => (
          <div
            key={idx}
            style={{
              marginLeft: idx === 0 ? '0px' : '-16px',
              transform: `rotate(${(idx - (visibleBackCount - 1) / 2) * 6}deg)`,
            }}
          >
            <UnoCard faceDown size="xs" />
          </div>
        ))}
      </div>

      {/* UNO Callout or Catch Penalty Button */}
      {cardCount === 1 && player.calledUno && (
        <span className="relative text-xs font-display font-black tracking-wide text-amber-300">
          UNO!
        </span>
      )}

      {canCatchUno && (
        <button
          type="button"
          onClick={() => onCatchUno(player.id)}
          className="relative mt-0.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-red-600 hover:bg-red-500 border-b-2 border-red-800 active:translate-y-0.5 text-xs font-bold text-white shadow cursor-pointer whitespace-nowrap"
        >
          Tangkap UNO!
        </button>
      )}
    </div>
  );
};
