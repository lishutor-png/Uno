import React from 'react';
import { UnoCard as UnoCardModel } from '../engine/types';
import { UnoCard } from './UnoCard';

const HERO_CARDS: Array<{
  card: UnoCardModel;
  style: string;
  glow?: string;
}> = [
  {
    card: { id: 'hero_red', color: 'red', value: '7' },
    style:
      '-translate-x-28 sm:-translate-x-36 translate-y-4 -rotate-[22deg] scale-90',
  },
  {
    card: { id: 'hero_yellow', color: 'yellow', value: 'reverse' },
    style:
      '-translate-x-14 sm:-translate-x-20 -translate-y-2 -rotate-[11deg] scale-95',
  },
  {
    card: { id: 'hero_green', color: 'green', value: 'skip' },
    style: 'translate-x-0 -translate-y-5 rotate-0 scale-100',
  },
  {
    card: { id: 'hero_blue', color: 'blue', value: 'draw2' },
    style:
      'translate-x-14 sm:translate-x-20 -translate-y-1 rotate-[12deg] scale-95',
  },
  {
    card: { id: 'hero_wild', color: 'wild', value: 'wild' },
    style:
      'translate-x-28 sm:translate-x-36 translate-y-6 rotate-[23deg] scale-90',
    glow: 'shadow-[0_0_26px_rgba(250,204,21,0.35)]',
  },
];

/**
 * Pure UNO card key-art composition resting in front-perspective on the green arena table.
 * Contains strictly authentic UNO cards (Red, Yellow, Green, Blue, Reverse, Skip, +2, Wild, Wild +4).
 * Zero poker or playing-card symbols.
 */
export const UnoMenuHeroIllustration: React.FC = () => {
  return (
    <div
      className="relative w-full h-full flex items-center justify-center select-none pointer-events-none"
      aria-label="Ilustrasi kartu UNO resmi: merah, kuning, hijau, biru, Reverse, Skip, +2, Wild, dan Wild +4"
    >
      {/* Ambient table spotlight behind cards */}
      <div className="absolute w-72 h-44 sm:w-96 sm:h-56 rounded-full bg-emerald-400/20 blur-3xl translate-y-6" />

      {/* 3D Perspective Stage */}
      <div
        className="relative flex items-center justify-center w-full max-w-[440px] h-[240px] sm:h-[300px]"
        style={{ perspective: '900px' }}
      >
        {/* Tabletop contact shadow ellipse */}
        <div
          className="absolute bottom-6 w-[82%] h-14 rounded-full bg-black/65 blur-xl"
          style={{ transform: 'rotateX(65deg)' }}
        />

        {/* Back Row: Dynamic 5-card UNO arc */}
        <div
          className="relative flex items-center justify-center"
          style={{ transform: 'rotateX(14deg) translateY(-14px)' }}
        >
          {HERO_CARDS.map(({ card, style, glow }) => (
            <div
              key={card.id}
              className={`absolute transition-transform duration-300 ${style}`}
            >
              <UnoCard
                card={card}
                size="table"
                className={`shadow-[0_18px_32px_rgba(0,0,0,0.62)] ${glow ?? ''}`}
              />
            </div>
          ))}
        </div>

        {/* Left Foreground: Stacked Face-down Draw Pile */}
        <div
          className="absolute left-3 sm:left-6 bottom-5 sm:bottom-7"
          style={{ transform: 'rotateX(22deg) rotate(-10deg) scale(0.84)' }}
        >
          <div className="relative">
            <div className="absolute top-2 left-1.5 opacity-85">
              <UnoCard faceDown size="table" />
            </div>
            <div className="absolute top-1 left-0.5 opacity-95">
              <UnoCard faceDown size="table" />
            </div>
            <UnoCard
              faceDown
              size="table"
              className="relative shadow-[0_14px_24px_rgba(0,0,0,0.65)]"
            />
          </div>
        </div>

        {/* Center-Front Focal Card: Wild Draw Four */}
        <div
          className="absolute bottom-3 sm:bottom-5 z-20"
          style={{ transform: 'rotateX(10deg) rotate(5deg) scale(1.06)' }}
        >
          <div className="relative">
            <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-gradient-to-tr from-red-500/35 via-amber-400/35 to-blue-500/35 blur-md" />
            <UnoCard
              card={{ id: 'hero_wild4', color: 'wild', value: 'wild4' }}
              size="table"
              className="relative ring-2 ring-amber-300/80 shadow-[0_22px_38px_rgba(0,0,0,0.75)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
