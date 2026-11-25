import React from 'react';
import { CardColor } from '../engine/types';
import { COLOR_LABELS_ID } from '../utilities/cardHelpers';

interface WildColorModalProps {
  onSelectColor: (color: CardColor) => void;
  onCancel?: () => void;
}

const COLOR_OPTIONS: Array<{
  color: CardColor;
  bg: string;
  hover: string;
  text: string;
}> = [
  {
    color: 'red',
    bg: 'bg-[#dc2626]',
    hover: 'hover:bg-[#ef4444]',
    text: 'text-white',
  },
  {
    color: 'yellow',
    bg: 'bg-[#eab308]',
    hover: 'hover:bg-[#facc15]',
    text: 'text-slate-950',
  },
  {
    color: 'green',
    bg: 'bg-[#16a34a]',
    hover: 'hover:bg-[#22c55e]',
    text: 'text-white',
  },
  {
    color: 'blue',
    bg: 'bg-[#2563eb]',
    hover: 'hover:bg-[#3b82f6]',
    text: 'text-white',
  },
];

export const WildColorModal: React.FC<WildColorModalProps> = ({
  onSelectColor,
  onCancel,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wild-color-title"
    >
      <div className="w-full max-w-xs sm:max-w-sm rounded-2xl bg-[#0b2e1f] border border-emerald-400/25 p-5 shadow-2xl">
        <h2
          id="wild-color-title"
          className="font-display text-lg sm:text-xl font-bold text-white text-center mb-1"
        >
          Pilih Warna Aktif
        </h2>
        <p className="text-xs text-emerald-200/75 text-center mb-4">
          Tentukan warna berikutnya untuk kartu Wild
        </p>

        <div className="grid grid-cols-2 gap-3">
          {COLOR_OPTIONS.map((opt) => (
            <button
              key={opt.color}
              type="button"
              onClick={() => onSelectColor(opt.color)}
              className={`min-h-[64px] rounded-xl font-display font-bold text-base shadow-lg border-2 border-white/80 transition-transform duration-150 hover:scale-[1.03] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${opt.bg} ${opt.hover} ${opt.text}`}
            >
              {COLOR_LABELS_ID[opt.color]}
            </button>
          ))}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 w-full min-h-[44px] rounded-xl border border-white/15 bg-black/25 hover:bg-black/40 text-sm font-medium text-emerald-100 cursor-pointer"
          >
            Batal
          </button>
        )}
      </div>
    </div>
  );
};
