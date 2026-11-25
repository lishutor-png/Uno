import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { CardColor, UnoCard as UnoCardModel } from '../engine/types';
import { COLOR_LABELS_ID, COLOR_SWATCH_STYLES } from '../utilities/cardHelpers';
import { UnoCard } from './UnoCard';

const ARENA_BG_PATH = '/src/assets/images/uno_arena_front_bg_1795600627346.jpg';

export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight >= window.innerWidth : false
  );

  useEffect(() => {
    const update = () => {
      setIsPortrait(window.innerHeight >= window.innerWidth);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return isPortrait;
}

interface FrontPerspectiveTableProps {
  topBar: React.ReactNode;
  turnBanner: React.ReactNode;
  opponentsRow: React.ReactNode;
  topDiscard: UnoCardModel;
  prevDiscard?: UnoCardModel | null;
  activeColor: CardColor;
  direction: 1 | -1;
  drawPileCount: number;
  pendingDrawCount: number;
  canDrawCard: boolean;
  hasDrawnThisTurn: boolean;
  highlightDrawPile: boolean;
  onDrawCard: () => void;
  onPassTurn: () => void;
  isMyTurn: boolean;
  bottomDock: React.ReactNode;
}

/**
 * Responsive 3D Front-Perspective UNO Arena stage:
 * - Portrait mode (Solo & 2-4p mobile): Tight, zero-waste vertical layout with oversized cards,
 *   BOT seats at top, turn & color status upper-center, large Discard & Draw piles center,
 *   and foreground hand + 48dp touch controls at bottom with safe areas.
 * - Landscape mode (5-8p multiplayer & tablet): Wide 3D perspective arena with side medallion.
 */
export const FrontPerspectiveTable: React.FC<FrontPerspectiveTableProps> = ({
  topBar,
  turnBanner,
  opponentsRow,
  topDiscard,
  prevDiscard = null,
  activeColor,
  direction,
  drawPileCount,
  pendingDrawCount,
  canDrawCard,
  hasDrawnThisTurn,
  highlightDrawPile,
  onDrawCard,
  onPassTurn,
  isMyTurn,
  bottomDock,
}) => {
  const isPortrait = useIsPortrait();
  const [bgLoaded, setBgLoaded] = useState(true);
  const [colorBurstKey, setColorBurstKey] = useState(0);
  const [reverseSpinKey, setReverseSpinKey] = useState(0);
  const [drawPulseKey, setDrawPulseKey] = useState(0);

  const prevColorRef = useRef(activeColor);
  const prevDirRef = useRef(direction);
  const prevDeckRef = useRef(drawPileCount);

  useEffect(() => {
    if (prevColorRef.current !== activeColor) {
      prevColorRef.current = activeColor;
      setColorBurstKey((k) => k + 1);
    }
  }, [activeColor]);

  useEffect(() => {
    if (prevDirRef.current !== direction) {
      prevDirRef.current = direction;
      setReverseSpinKey((k) => k + 1);
    }
  }, [direction]);

  useEffect(() => {
    if (drawPileCount < prevDeckRef.current) {
      setDrawPulseKey((k) => k + 1);
    }
    prevDeckRef.current = drawPileCount;
  }, [drawPileCount]);

  const colorStyle = COLOR_SWATCH_STYLES[activeColor];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#04120c] flex flex-col justify-between select-none animate-screen-enter">
      {/* Room Backdrop */}
      {bgLoaded && (
        <img
          src={ARENA_BG_PATH}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onError={() => setBgLoaded(false)}
          className="pointer-events-none absolute inset-0 w-full h-full object-cover object-top opacity-30 blur-[1.5px] scale-105"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-[#031b11]/55 to-black/85" />

      {/* Overhead Arena Spotlight */}
      <div className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[78%] h-[48%] rounded-full bg-amber-200/10 blur-3xl" />

      {/* 3D Perspective Card Table Surface (tight margins in portrait so cards dominate) */}
      <div
        className={`pointer-events-none absolute flex flex-col items-center justify-center ${
          isPortrait
            ? 'inset-x-1.5 top-[13%] bottom-[22%]'
            : 'inset-x-4 sm:inset-x-10 lg:inset-x-20 top-[14%] bottom-[8%]'
        }`}
        style={{ perspective: '1050px' }}
      >
        <div
          className="relative w-full h-full max-w-[1160px] flex flex-col"
          style={{
            transform: isPortrait
              ? 'rotateX(18deg) scale(1.01)'
              : 'rotateX(27deg) scale(1.03)',
            transformOrigin: 'center 60%',
          }}
        >
          <div
            className={`relative flex-1 uno-felt-surface border-[#4b1e07] shadow-[0_26px_64px_rgba(0,0,0,0.85),inset_0_0_40px_rgba(0,0,0,0.65)] overflow-hidden ${
              isPortrait
                ? 'rounded-[32px] border-[8px]'
                : 'rounded-[44px] sm:rounded-[72px] border-[10px] sm:border-[15px]'
            }`}
          >
            <div
              className={`absolute border border-amber-300/20 ${
                isPortrait
                  ? 'inset-1.5 rounded-[24px]'
                  : 'inset-2 sm:inset-3 rounded-[32px] sm:rounded-[54px]'
              }`}
            />

            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-36 sm:w-80 sm:h-48 rounded-full opacity-20 blur-2xl transition-colors duration-300 ${colorStyle.bg}`}
            />

            <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
              <span className="font-display font-black text-3xl sm:text-6xl tracking-[0.2em] text-amber-200">
                UNO ARENA
              </span>
            </div>
          </div>

          <div
            className={`-mt-2.5 bg-gradient-to-b from-[#652b0d] via-[#3d1705] to-[#1a0801] border-x-4 border-b-2 border-[#250d02] shadow-[0_14px_30px_rgba(0,0,0,0.9)] ${
              isPortrait
                ? 'mx-3 h-3.5 rounded-b-[24px]'
                : 'mx-5 sm:mx-10 h-4 sm:h-6 rounded-b-[32px] sm:rounded-b-[48px]'
            }`}
          />
        </div>
      </div>

      {/* Top Zone: Safe-area Header + Opponents Seated Across Table */}
      <header className="relative z-20 flex flex-col gap-1 safe-pt px-2.5 sm:px-5">
        <div className="flex items-center justify-between gap-2">{topBar}</div>

        <div className="no-scrollbar w-full overflow-x-auto touch-pan-x flex items-center justify-start sm:justify-center gap-2 sm:gap-3 px-1 py-0.5">
          {opponentsRow}
        </div>
      </header>

      {/* Upper-Center: Turn Status (+ Inline Direction & Color Strip in Portrait) */}
      <div className="relative z-20 flex flex-col items-center text-center px-2.5 gap-1">
        {turnBanner}

        {isPortrait && (
          <div className="flex items-center justify-center gap-3 rounded-xl bg-black/55 backdrop-blur-sm border border-amber-300/20 px-3.5 py-1.5 shadow-md">
            <div className="flex items-center gap-1.5">
              <div
                key={reverseSpinKey}
                className={`w-6 h-6 rounded-full bg-white/10 border border-amber-300/40 flex items-center justify-center text-amber-300 ${
                  reverseSpinKey > 0 ? 'animate-reverse-spin' : ''
                }`}
              >
                {direction === 1 ? (
                  <RotateCw className="w-3.5 h-3.5" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-xs font-semibold text-emerald-100/90">
                {direction === 1 ? 'Searah' : 'Berlawanan'}
              </span>
            </div>

            <div className="w-px h-4 bg-white/15" />

            <div className="relative flex items-center gap-1.5">
              {colorBurstKey > 0 && (
                <div
                  key={`pburst_${colorBurstKey}`}
                  className={`pointer-events-none absolute -left-0.5 w-6 h-6 rounded-md ring-2 ${colorStyle.ring} animate-color-burst`}
                />
              )}
              <div
                className={`w-5 h-5 rounded-md border-2 border-white shadow ${colorStyle.bg}`}
                aria-label={`Warna aktif ${COLOR_LABELS_ID[activeColor]}`}
              />
              <span className="text-xs font-bold text-white">
                {COLOR_LABELS_ID[activeColor]}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Center Tabletop Zone: Side Medallion (Landscape only) | Discard Pile | Draw Pile */}
      <main
        className={`relative z-20 flex-1 flex items-center justify-center min-h-0 ${
          isPortrait
            ? 'gap-5 px-3 py-1'
            : 'gap-5 sm:gap-10 lg:gap-14 px-3 sm:px-8'
        }`}
      >
        {!isPortrait && (
          <div
            className="flex flex-col items-center gap-2 rounded-2xl bg-black/55 backdrop-blur-sm border border-amber-300/20 px-3 py-2.5 sm:px-4 sm:py-3 shadow-[0_14px_28px_rgba(0,0,0,0.55)] shrink-0"
            style={{ transform: 'perspective(800px) rotateX(10deg)' }}
          >
            <div className="flex flex-col items-center gap-1">
              <div
                key={reverseSpinKey}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 border border-amber-300/40 flex items-center justify-center text-amber-300 ${
                  reverseSpinKey > 0 ? 'animate-reverse-spin' : ''
                }`}
              >
                {direction === 1 ? (
                  <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-100/85 whitespace-nowrap">
                {direction === 1 ? 'Searah' : 'Berlawanan'}
              </span>
            </div>

            <div className="w-full h-px bg-white/10" />

            <div className="relative flex flex-col items-center gap-1">
              {colorBurstKey > 0 && (
                <div
                  key={`burst_${colorBurstKey}`}
                  className={`pointer-events-none absolute -top-1 w-9 h-9 sm:w-11 sm:h-11 rounded-xl ring-4 ${colorStyle.ring} animate-color-burst`}
                />
              )}
              <div
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg border-2 border-white shadow-md ring-2 ring-offset-2 ring-offset-[#042316] transition-colors duration-200 ${colorStyle.bg} ${colorStyle.ring}`}
                aria-label={`Warna aktif ${COLOR_LABELS_ID[activeColor]}`}
              />
              <span className="text-[11px] sm:text-xs font-bold text-white whitespace-nowrap">
                {COLOR_LABELS_ID[activeColor]}
              </span>
            </div>
          </div>
        )}

        {/* Center: Discard Pile */}
        <div
          className="relative flex flex-col items-center justify-center"
          style={{ transform: 'perspective(850px) rotateX(9deg)' }}
        >
          <div className="relative flex items-center justify-center">
            <div className="pointer-events-none absolute -bottom-3 w-[115%] h-8 rounded-full bg-black/70 blur-md" />
            <div
              className={`pointer-events-none absolute -inset-3 rounded-2xl opacity-35 ring-4 transition-colors duration-200 ${colorStyle.ring}`}
            />
            {colorBurstKey > 0 && (
              <div
                key={`center_burst_${colorBurstKey}`}
                className={`pointer-events-none absolute -inset-4 rounded-2xl ring-4 ${colorStyle.ring} animate-color-burst`}
              />
            )}

            {prevDiscard && (
              <div className="absolute -rotate-12 -translate-x-3 translate-y-1.5 opacity-80 pointer-events-none">
                <UnoCard card={prevDiscard} size="table" />
              </div>
            )}

            <div key={topDiscard.id} className="relative animate-discard-pop">
              <UnoCard
                card={topDiscard}
                size="table"
                activeWildColor={
                  topDiscard.color === 'wild' ? activeColor : undefined
                }
                className="shadow-[0_18px_36px_rgba(0,0,0,0.7)]"
              />
            </div>
          </div>

          {isPortrait && (
            <div className="mt-2 text-[11px] font-semibold text-emerald-100/80">
              Kartu Meja
            </div>
          )}
        </div>

        {/* Center-Right: 3D Stacked Draw Pile + 48dp Touch Draw/Pass CTA */}
        <div
          className="flex flex-col items-center gap-2 shrink-0"
          style={{ transform: 'perspective(850px) rotateX(9deg)' }}
        >
          <div
            key={`deck_${drawPulseKey}`}
            className={`relative ${drawPulseKey > 0 ? 'animate-draw-pulse' : ''}`}
          >
            <div className="pointer-events-none absolute -bottom-2.5 inset-x-0 h-7 rounded-full bg-black/70 blur-md" />
            <div className="absolute top-2 left-2 opacity-80 pointer-events-none">
              <UnoCard faceDown size="table" />
            </div>
            <div className="absolute top-1 left-1 opacity-90 pointer-events-none">
              <UnoCard faceDown size="table" />
            </div>

            <UnoCard
              faceDown
              size="table"
              onClick={canDrawCard ? onDrawCard : undefined}
              className={
                highlightDrawPile
                  ? 'ring-2 ring-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.55)]'
                  : 'shadow-[0_16px_30px_rgba(0,0,0,0.65)]'
              }
            />

            <div className="mt-1.5 text-center text-xs font-mono-num font-bold text-emerald-100/90 drop-shadow">
              Deck: {drawPileCount}
            </div>

            {pendingDrawCount > 0 && (
              <div className="absolute -top-2.5 -right-2.5 rounded-lg bg-red-600 border-2 border-white px-2.5 py-0.5 font-display font-black text-sm text-white shadow-lg tabular-nums">
                +{pendingDrawCount}
              </div>
            )}
          </div>

          {canDrawCard && (
            <button
              type="button"
              onClick={onDrawCard}
              className={`min-h-[48px] px-4 sm:px-5 py-2 rounded-xl font-display font-extrabold text-sm shadow-lg cursor-pointer transition-transform active:translate-y-0.5 whitespace-nowrap border-b-4 ${
                pendingDrawCount > 0
                  ? 'bg-red-600 hover:bg-red-500 border-red-800 text-white'
                  : highlightDrawPile
                    ? 'bg-amber-400 hover:bg-amber-300 border-amber-600 text-slate-950'
                    : 'bg-emerald-800 hover:bg-emerald-700 border-emerald-950 text-white'
              }`}
            >
              {pendingDrawCount > 0
                ? `Ambil +${pendingDrawCount}`
                : 'Ambil Kartu'}
            </button>
          )}

          {isMyTurn && hasDrawnThisTurn && (
            <button
              type="button"
              onClick={onPassTurn}
              className="min-h-[48px] px-4 sm:px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-sm shadow-lg cursor-pointer whitespace-nowrap"
            >
              Lewati Giliran
            </button>
          )}
        </div>
      </main>

      {/* Bottom Foreground Zone: Player Cards + Touch Controls */}
      {bottomDock}
    </div>
  );
};
