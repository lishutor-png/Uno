import React from 'react';
import { Home, RotateCw, Trophy } from 'lucide-react';
import { VictoryConfetti } from '../components/VictoryConfetti';
import { MatchResult } from '../engine/types';
import { formatDuration } from '../utilities/cardHelpers';

interface MatchResultScreenProps {
  result: MatchResult;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export const MatchResultScreen: React.FC<MatchResultScreenProps> = ({
  result,
  onPlayAgain,
  onBackToMenu,
}) => {
  const humanWon = !result.winnerIsBot;

  return (
    <div className="relative w-full h-full overflow-y-auto bg-gradient-to-br from-[#072e1e] via-[#041d13] to-[#02100a] px-4 sm:px-8 py-5 safe-pt safe-pb flex items-center justify-center">
      {humanWon && <VictoryConfetti active />}
      <div className="w-full max-w-3xl rounded-2xl bg-black/40 border border-emerald-400/20 p-5 sm:p-7 shadow-2xl">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                humanWon
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-emerald-900/80 text-amber-300 border border-amber-400/30'
              }`}
            >
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                {humanWon ? 'Kamu Menang!' : `${result.winnerName} Menang!`}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/75 tabular-nums">
                Skor Pemenang: {result.totalPointsEarned} poin · Durasi:{' '}
                {formatDuration(result.durationSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onPlayAgain}
              className="min-h-[48px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <RotateCw className="w-4 h-4" />
              <span>Main Lagi</span>
            </button>
            <button
              type="button"
              onClick={onBackToMenu}
              className="min-h-[48px] px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              <span>Menu Utama</span>
            </button>
          </div>
        </div>

        {/* Scoreboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs text-emerald-200/70 border-b border-white/10">
                <th className="py-2 pr-3 font-medium">Peringkat</th>
                <th className="py-2 pr-3 font-medium">Pemain</th>
                <th className="py-2 pr-3 font-medium text-right">Sisa Kartu</th>
                <th className="py-2 font-medium text-right">Poin Tangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {result.playerScores.map((row, idx) => (
                <tr key={row.playerId}>
                  <td className="py-2.5 pr-3 font-mono-num font-bold text-amber-300">
                    #{idx + 1}
                  </td>
                  <td className="py-2.5 pr-3 font-semibold text-white">
                    {row.playerName}
                    {row.isWinner && (
                      <span className="ml-2 text-xs font-bold text-amber-300">
                        (Juara)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono-num text-emerald-100/85">
                    {row.remainingCards}
                  </td>
                  <td className="py-2.5 text-right font-mono-num text-emerald-100/85">
                    {row.handPoints} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
