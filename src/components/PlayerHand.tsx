import React, { useRef } from 'react';
import { UnoCard as UnoCardModel } from '../engine/types';
import { HandLayoutMode } from '../storage/types';
import { UnoCard } from './UnoCard';

interface PlayerHandProps {
  hand: readonly UnoCardModel[];
  playableCardIds: Set<string>;
  isMyTurn: boolean;
  layoutMode: HandLayoutMode;
  isInitialDeal?: boolean;
  onPlayCard: (card: UnoCardModel) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  hand,
  playableCardIds,
  isMyTurn,
  layoutMode,
  isInitialDeal = false,
  onPlayCard,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const count = hand.length;
  const centerIndex = (count - 1) / 2;

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar w-full overflow-x-auto overflow-y-visible touch-pan-x flex items-end justify-start sm:justify-center px-4 sm:px-10 pt-5 pb-2 scroll-smooth"
    >
      <div className="flex items-end mx-auto min-w-max">
        {hand.map((card, idx) => {
          const isPlayable = isMyTurn && playableCardIds.has(card.id);
          const isDimmed = isMyTurn && !isPlayable;

          let cardStyle: React.CSSProperties = {};
          if (layoutMode === 'fan') {
            const offset = idx - centerIndex;
            const maxAngle = Math.min(18, count * 1.8);
            const angle =
              count > 1 ? (offset / Math.max(1, centerIndex)) * maxAngle : 0;
            const dropY =
              Math.abs(offset) * Math.abs(offset) * (count > 9 ? 0.35 : 0.75);
            const overlap =
              count > 12 ? '-26px' : count > 8 ? '-20px' : count > 5 ? '-12px' : '-6px';

            cardStyle = {
              transform: `rotate(${angle.toFixed(2)}deg) translateY(${dropY.toFixed(1)}px)`,
              transformOrigin: 'bottom center',
              marginLeft: idx === 0 ? '0px' : overlap,
              zIndex: idx + 1,
              animationDelay: isInitialDeal ? `${Math.min(idx * 40, 240)}ms` : '0ms',
            };
          } else {
            // Mode Tumpuk (Stack): straight compact row with readable corner indices
            const overlap =
              count > 12 ? '-32px' : count > 7 ? '-24px' : count > 4 ? '-16px' : '-10px';
            cardStyle = {
              marginLeft: idx === 0 ? '0px' : overlap,
              zIndex: idx + 1,
              animationDelay: isInitialDeal ? `${Math.min(idx * 40, 240)}ms` : '0ms',
            };
          }

          return (
            <div
              key={card.id}
              style={cardStyle}
              className="relative transition-transform duration-150 ease-out hover:z-40 animate-card-deal"
            >
              <UnoCard
                card={card}
                size="hand"
                playable={isPlayable}
                dimmed={isDimmed}
                onClick={() => onPlayCard(card)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
