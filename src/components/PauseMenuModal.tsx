import React from 'react';
import { RoomRuleConfig } from '../engine/types';

interface PauseMenuModalProps {
  soundEnabled: boolean;
  rules: RoomRuleConfig;
  onToggleSound: () => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToMenu: () => void;
}

export const PauseMenuModal: React.FC<PauseMenuModalProps> = ({
  soundEnabled,
  rules,
  onToggleSound,
  onResume,
  onRestart,
  onExitToMenu,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#09281a] border border-emerald-400/20 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 id="pause-title" className="font-display text-xl font-bold text-white">
            Permainan Dijeda
          </h2>
          <span className="text-xs font-medium text-emerald-200/80">
            {rules.preset === 'CLASSIC' ? 'Aturan Classic' : 'House Rules'}
          </span>
        </div>

        <div className="rounded-xl bg-black/25 border border-white/10 p-3.5 mb-5 text-xs text-emerald-100/85 space-y-1.5">
          <div className="font-semibold text-white mb-1">Aturan Aktif:</div>
          <div>Stacking +2: {rules.stackPlus2 ? 'Aktif' : 'Nonaktif'}</div>
          <div>Stacking +4: {rules.stackPlus4 ? 'Aktif' : 'Nonaktif'}</div>
          <div>Tumpuk +2 & +4: {rules.stackPlus2AndPlus4 ? 'Aktif' : 'Nonaktif'}</div>
          <div>Penalti Lupa UNO: {rules.unoPenalty ? 'Aktif (+2)' : 'Nonaktif'}</div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[46px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-base cursor-pointer transition-transform active:scale-98"
          >
            Lanjutkan Bermain
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            className="w-full min-h-[44px] rounded-xl bg-emerald-900/70 hover:bg-emerald-800/80 border border-white/10 text-white font-semibold text-sm cursor-pointer"
          >
            Efek Suara: {soundEnabled ? 'Nyala' : 'Mati'}
          </button>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={onRestart}
              className="min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm cursor-pointer"
            >
              Ulangi Match
            </button>
            <button
              type="button"
              onClick={onExitToMenu}
              className="min-h-[44px] rounded-xl bg-red-600/85 hover:bg-red-500 text-white font-semibold text-sm cursor-pointer"
            >
              Keluar ke Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
