import {
  CardColor,
  GameState,
  RoomRuleConfig,
  UnoCard,
} from './types';

export const CLASSIC_RULES: RoomRuleConfig = {
  preset: 'CLASSIC',
  stackPlus2: false,
  stackPlus4: false,
  stackPlus2AndPlus4: false,
  unoPenalty: true,
};

export const DEFAULT_HOUSE_RULES: RoomRuleConfig = {
  preset: 'HOUSE_RULES',
  stackPlus2: true,
  stackPlus4: true,
  stackPlus2AndPlus4: false,
  unoPenalty: true,
};

export function getCardPoints(card: UnoCard): number {
  if (card.value === 'wild' || card.value === 'wild4') {
    return 50;
  }
  if (card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2') {
    return 20;
  }
  return Number.parseInt(card.value, 10) || 0;
}

export function calculateHandPoints(hand: readonly UnoCard[]): number {
  return hand.reduce((sum, card) => sum + getCardPoints(card), 0);
}

/**
 * Checks whether `card` can legally be played on the current game state
 * by `playerHand`.
 */
export function isCardPlayable(
  card: UnoCard,
  state: Pick<
    GameState,
    | 'discardPile'
    | 'activeColor'
    | 'pendingDrawCount'
    | 'pendingDrawType'
    | 'rules'
    | 'hasDrawnThisTurn'
    | 'drawnCardIdThisTurn'
  >,
  playerHand: readonly UnoCard[]
): boolean {
  const topCard = state.discardPile[state.discardPile.length - 1];
  if (!topCard) {
    return false;
  }

  // If the player just drew 1 card on a normal turn, they may only play that exact card
  if (state.hasDrawnThisTurn) {
    if (!state.drawnCardIdThisTurn || card.id !== state.drawnCardIdThisTurn) {
      return false;
    }
  }

  // Stacking state: only valid stack cards can be played
  if (state.pendingDrawCount > 0 && state.pendingDrawType) {
    if (state.pendingDrawType === 'draw2') {
      if (card.value === 'draw2' && state.rules.stackPlus2) {
        return true;
      }
      if (
        card.value === 'wild4' &&
        state.rules.stackPlus4 &&
        state.rules.stackPlus2AndPlus4
      ) {
        return true;
      }
      return false;
    }

    if (state.pendingDrawType === 'wild4') {
      if (card.value === 'wild4' && state.rules.stackPlus4) {
        return true;
      }
      if (
        card.value === 'draw2' &&
        state.rules.stackPlus2 &&
        state.rules.stackPlus2AndPlus4
      ) {
        return true;
      }
      return false;
    }
  }

  // Normal play: Wild cards
  if (card.value === 'wild') {
    return true;
  }

  if (card.value === 'wild4') {
    // In Classic UNO, Wild +4 is ideally played when player holds no card matching activeColor;
    // in practice both casual and digital UNO allow bluffing or restrict in strict mode.
    // Here we allow Wild +4 as playable (while Hard Bot respects strategic timing).
    // Wait: if we want Classic strict check? Let's keep Wild +4 playable when no matching activeColor
    // in CLASSIC if player has other cards, OR always playable?
    // Standard digital UNO allows playing Wild +4 anytime unless strict challenge rule exists.
    // Keeping it always playable avoids frustrating human UX traps when no challenge UI exists.
    void playerHand;
    return true;
  }

  // Match active color
  if (card.color === state.activeColor) {
    return true;
  }

  // Match value / symbol
  if (card.value === topCard.value) {
    return true;
  }

  return false;
}

export function getPlayableCards(
  hand: readonly UnoCard[],
  state: Pick<
    GameState,
    | 'discardPile'
    | 'activeColor'
    | 'pendingDrawCount'
    | 'pendingDrawType'
    | 'rules'
    | 'hasDrawnThisTurn'
    | 'drawnCardIdThisTurn'
  >
): UnoCard[] {
  return hand.filter((card) => isCardPlayable(card, state, hand));
}

export function getDominantColorInHand(hand: readonly UnoCard[]): CardColor {
  const counts: Record<CardColor, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    blue: 0,
  };

  for (const card of hand) {
    if (card.color !== 'wild') {
      counts[card.color] += 1;
    }
  }

  const colors: CardColor[] = ['red', 'yellow', 'green', 'blue'];
  let best: CardColor = 'red';
  let bestCount = -1;

  for (const c of colors) {
    if (counts[c] > bestCount) {
      bestCount = counts[c];
      best = c;
    }
  }

  return best;
}
