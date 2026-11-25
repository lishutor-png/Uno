import React from 'react';
import { CardColor, UnoCard as UnoCardModel } from '../engine/types';

interface UnoCardProps {
  card?: UnoCardModel;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'hand' | 'table';
  playable?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  activeWildColor?: CardColor;
}

const SIZE_CLASSES: Record<NonNullable<UnoCardProps['size']>, string> = {
  xs: 'w-8 h-11 sm:w-9 sm:h-12 rounded-md border-[1.5px]',
  sm: 'w-14 h-20 rounded-lg border-2',
  hand: 'uno-card-hand-size rounded-2xl border-[3px]',
  table: 'uno-card-table-size rounded-2xl border-[3px]',
};

const COLOR_GRADIENTS: Record<UnoCardModel['color'], string> = {
  red: 'bg-gradient-to-br from-[#f87171] via-[#dc2626] to-[#991b1b]',
  yellow: 'bg-gradient-to-br from-[#fde047] via-[#eab308] to-[#b45309]',
  green: 'bg-gradient-to-br from-[#4ade80] via-[#16a34a] to-[#14532d]',
  blue: 'bg-gradient-to-br from-[#60a5fa] via-[#2563eb] to-[#1e3a8a]',
  wild: 'bg-gradient-to-br from-[#334155] via-[#0f172a] to-[#020617]',
};

const TEXT_COLORS: Record<UnoCardModel['color'], string> = {
  red: 'text-[#dc2626]',
  yellow: 'text-[#b45309]',
  green: 'text-[#15803d]',
  blue: 'text-[#1d4ed8]',
  wild: 'text-slate-900',
};

const ACTIVE_COLOR_BG: Record<CardColor, string> = {
  red: 'bg-[#dc2626]',
  yellow: 'bg-[#eab308]',
  green: 'bg-[#16a34a]',
  blue: 'bg-[#2563eb]',
};

function CornerSymbol({ card }: { card: UnoCardModel }) {
  switch (card.value) {
    case 'skip':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 sm:w-4.5 sm:h-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
        >
          <circle cx="12" cy="12" r="8" />
          <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" />
        </svg>
      );
    case 'reverse':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5 sm:w-4 sm:h-4"
          fill="currentColor"
        >
          <path d="M7 7h9l-2.5-2.5L15 3l5 5-5 5-1.5-1.5L16 9H7V7zm10 10H8l2.5 2.5L9 21l-5-5 5-5 1.5 1.5L8 15h9v2z" />
        </svg>
      );
    case 'draw2':
      return (
        <span className="font-display font-black leading-none tracking-tighter">
          +2
        </span>
      );
    case 'wild':
      return (
        <span className="font-display font-black leading-none text-[11px] sm:text-xs">
          W
        </span>
      );
    case 'wild4':
      return (
        <span className="font-display font-black leading-none tracking-tighter">
          +4
        </span>
      );
    default: {
      const needsUnderline = card.value === '6' || card.value === '9';
      return (
        <span
          className={`font-display font-black leading-none ${
            needsUnderline ? 'underline decoration-2 underline-offset-1' : ''
          }`}
        >
          {card.value}
        </span>
      );
    }
  }
}

function CenterArtwork({
  card,
  size,
  activeWildColor,
}: {
  card: UnoCardModel;
  size: NonNullable<UnoCardProps['size']>;
  activeWildColor?: CardColor;
}) {
  const isLarge = size === 'table' || size === 'hand';
  const iconDim = isLarge ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-6 h-6';

  if (card.value === 'wild') {
    return (
      <div className="relative flex items-center justify-center w-10 h-12 sm:w-12 sm:h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
          <div className="bg-[#dc2626]" />
          <div className="bg-[#2563eb]" />
          <div className="bg-[#eab308]" />
          <div className="bg-[#16a34a]" />
        </div>
        {activeWildColor && (
          <span
            className={`absolute inset-1.5 rounded-full border-2 border-white shadow-lg ${ACTIVE_COLOR_BG[activeWildColor]}`}
          />
        )}
      </div>
    );
  }

  if (card.value === 'wild4') {
    return (
      <div className="relative flex items-center justify-center w-11 h-12 sm:w-14 sm:h-16">
        <div className="grid grid-cols-2 gap-0.5 rotate-[-8deg]">
          <span className="w-3 h-4 sm:w-4 sm:h-6 rounded-[3px] bg-[#dc2626] border border-white shadow" />
          <span className="w-3 h-4 sm:w-4 sm:h-6 rounded-[3px] bg-[#2563eb] border border-white shadow translate-y-1" />
          <span className="w-3 h-4 sm:w-4 sm:h-6 rounded-[3px] bg-[#eab308] border border-white shadow -translate-y-0.5" />
          <span className="w-3 h-4 sm:w-4 sm:h-6 rounded-[3px] bg-[#16a34a] border border-white shadow translate-y-0.5" />
        </div>
        {activeWildColor && (
          <span
            className={`absolute -bottom-1 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow-md ${ACTIVE_COLOR_BG[activeWildColor]}`}
          />
        )}
      </div>
    );
  }

  if (card.value === 'skip') {
    return (
      <svg
        viewBox="0 0 32 32"
        className={`${iconDim} drop-shadow-sm`}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.6"
      >
        <circle cx="16" cy="16" r="11" />
        <line x1="8" y1="24" x2="24" y2="8" />
      </svg>
    );
  }

  if (card.value === 'reverse') {
    return (
      <svg
        viewBox="0 0 32 32"
        className={`${iconDim} drop-shadow-sm`}
        fill="currentColor"
      >
        <path d="M8 9h12l-3.2-3.2L18.8 4 25.5 10.7 18.8 17.4 16.8 15.6 20 12.4H8V9zm16 14H12l3.2 3.2L13.2 28 6.5 21.3l6.7-6.7 2 1.8-3.2 3.2h12V23z" />
      </svg>
    );
  }

  if (card.value === 'draw2') {
    return (
      <div className="relative flex items-center justify-center">
        <div className="w-4 h-6 sm:w-6 sm:h-8 rounded-[4px] bg-current opacity-85 border-2 border-white -translate-x-1.5 translate-y-1 shadow-sm" />
        <div className="w-4 h-6 sm:w-6 sm:h-8 rounded-[4px] bg-current border-2 border-white translate-x-1.5 -translate-y-1 shadow-md" />
      </div>
    );
  }

  const needsUnderline = card.value === '6' || card.value === '9';
  return (
    <span
      className={`font-display font-black leading-none tracking-tight drop-shadow-sm ${
        size === 'table'
          ? 'text-4xl sm:text-5xl'
          : size === 'hand'
            ? 'text-4xl sm:text-5xl'
            : 'text-2xl'
      } ${needsUnderline ? 'underline decoration-[3px] underline-offset-2' : ''}`}
    >
      {card.value}
    </span>
  );
}

export const UnoCard: React.FC<UnoCardProps> = ({
  card,
  faceDown = false,
  size = 'hand',
  playable = false,
  dimmed = false,
  selected = false,
  onClick,
  className = '',
  activeWildColor,
}) => {
  const sizeCls = SIZE_CLASSES[size];

  if (faceDown || !card) {
    const isTiny = size === 'xs';
    return (
      <div
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={`relative select-none border-white/95 bg-gradient-to-br from-slate-800 via-slate-950 to-black uno-card-back-pattern shadow-[0_6px_18px_rgba(0,0,0,0.48)] overflow-hidden flex items-center justify-center ${sizeCls} ${
          onClick
            ? 'cursor-pointer transition-transform duration-150 hover:-translate-y-1.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'
            : ''
        } ${className}`}
      >
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/15 rounded-[inherit]" />
        <div
          className={`flex items-center justify-center rounded-full bg-gradient-to-br from-red-600 via-red-600 to-red-800 border-2 border-amber-300/85 -rotate-12 shadow-md ${
            isTiny ? 'w-5 h-3.5' : 'w-[80%] h-[54%]'
          }`}
        >
          {!isTiny && (
            <span className="font-display font-black tracking-tight text-amber-300 drop-shadow text-xs sm:text-base">
              UNO
            </span>
          )}
        </div>
      </div>
    );
  }

  const cardBg = COLOR_GRADIENTS[card.color];
  const centerTextColor = TEXT_COLORS[card.color];
  const isYellow = card.color === 'yellow';
  const cornerTextColor = isYellow ? 'text-slate-950' : 'text-white';
  const isSpecial =
    card.value === 'skip' ||
    card.value === 'reverse' ||
    card.value === 'draw2' ||
    card.value === 'wild' ||
    card.value === 'wild4';

  const interactiveState = onClick
    ? playable
      ? 'cursor-pointer -translate-y-2.5 hover:-translate-y-4 active:scale-95 ring-2 ring-amber-300 shadow-[0_14px_28px_rgba(251,191,36,0.45)]'
      : 'cursor-not-allowed'
    : '';

  const dimmedCls = dimmed ? 'opacity-50 saturate-[0.7] brightness-90' : '';
  const selectedCls = selected ? '-translate-y-4 ring-4 ring-white' : '';

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={onClick ? !playable : undefined}
      aria-label={`${card.color} ${card.value}`}
      className={`relative select-none border-white shadow-[0_12px_26px_rgba(0,0,0,0.56)] overflow-hidden flex items-center justify-center transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${sizeCls} ${cardBg} ${interactiveState} ${dimmedCls} ${selectedCls} ${className}`}
    >
      {/* Subtle printed card sheen & crisp inner bevel */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/25" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/25 rounded-[inherit]" />
      {isSpecial && (playable || size === 'table') && (
        <div className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-special-shimmer" />
      )}

      {/* Top-left corner index */}
      <div
        className={`absolute top-1.5 left-2 text-sm sm:text-base font-black drop-shadow-sm ${cornerTextColor}`}
      >
        <CornerSymbol card={card} />
      </div>

      {/* Center oval emblem */}
      <div
        className={`w-[78%] h-[64%] rounded-[999px] bg-white/95 shadow-[inset_0_2px_6px_rgba(0,0,0,0.18)] border border-black/10 flex items-center justify-center -rotate-12 ${centerTextColor}`}
      >
        <div className="rotate-12 flex items-center justify-center">
          <CenterArtwork
            card={card}
            size={size}
            activeWildColor={activeWildColor}
          />
        </div>
      </div>

      {/* Bottom-right corner index */}
      <div
        className={`absolute bottom-1.5 right-2 rotate-180 text-sm sm:text-base font-black drop-shadow-sm ${cornerTextColor}`}
      >
        <CornerSymbol card={card} />
      </div>
    </Tag>
  );
};
