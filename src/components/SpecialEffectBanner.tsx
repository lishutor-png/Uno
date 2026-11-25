import React from 'react';
import { CardColor, SpecialEffectType } from '../engine/types';
import { COLOR_LABELS_ID } from '../utilities/cardHelpers';

interface SpecialEffectBannerProps {
  effectKey: string;
  effectType: SpecialEffectType;
  actorName: string;
  chosenColor?: CardColor;
}

const EFFECT_STYLES: Record<
  SpecialEffectType,
  { title: string; accent: string }
> = {
  SKIP: { title: 'SKIP!', accent: 'bg-amber-500 text-slate-950' },
  REVERSE: { title: 'ARAH DIBALIK!', accent: 'bg-sky-500 text-slate-950' },
  DRAW2: { title: '+2 KARTU!', accent: 'bg-red-600 text-white' },
  WILD: { title: 'PILIH WARNA!', accent: 'bg-slate-900 text-white border border-amber-400' },
  WILD4: { title: 'WILD +4!', accent: 'bg-slate-950 text-amber-300 border border-amber-400' },
  UNO: { title: 'UNO!', accent: 'bg-amber-400 text-slate-950' },
  PENALTY: { title: 'PENALTI +2!', accent: 'bg-red-700 text-white' },
  RESHUFFLE: { title: 'DECK DIKOCOK ULANG', accent: 'bg-emerald-700 text-white' },
};

export const SpecialEffectBanner: React.FC<SpecialEffectBannerProps> = ({
  effectKey,
  effectType,
  actorName,
  chosenColor,
}) => {
  const cfg = EFFECT_STYLES[effectType];
  const subLabel = chosenColor
    ? `${actorName} → ${COLOR_LABELS_ID[chosenColor]}`
    : actorName;

  return (
    <div
      key={effectKey}
      className="pointer-events-none fixed inset-x-0 top-[26%] z-40 flex justify-center px-4"
    >
      <div
        className={`animate-effect-float rounded-2xl px-6 py-3 shadow-2xl text-center ${cfg.accent}`}
      >
        <div className="font-display text-xl sm:text-2xl font-black tracking-tight">
          {cfg.title}
        </div>
        <div className="text-xs font-semibold opacity-90">{subLabel}</div>
      </div>
    </div>
  );
};
