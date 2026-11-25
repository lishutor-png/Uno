import {
  BotDifficulty,
  CardColor,
  GameState,
  Player,
  UnoCard,
} from './types';
import {
  getCardPoints,
  getDominantColorInHand,
  getPlayableCards,
} from './rules';

export type BotDecision =
  | { type: 'PLAY'; cardId: string; chosenColor?: CardColor }
  | { type: 'DRAW' }
  | { type: 'PASS' };

const ALL_COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];

function getNextTurnPlayer(state: GameState, steps = 1): Player {
  const total = state.players.length;
  const idx =
    (((state.currentTurnIndex + state.direction * steps) % total) + total) %
    total;
  return state.players[idx];
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Decides the next legal move for a BOT player strictly following the active GameState rules.
 */
export function decideBotMove(
  state: GameState,
  botPlayer: Player
): BotDecision {
  const difficulty: BotDifficulty = botPlayer.botDifficulty ?? 'normal';
  const playable = getPlayableCards(botPlayer.hand, state);

  // If bot already drew 1 card this turn:
  if (state.hasDrawnThisTurn) {
    if (playable.length > 0) {
      const card = playable[0];
      return {
        type: 'PLAY',
        cardId: card.id,
        chosenColor:
          card.color === 'wild'
            ? chooseWildColor(difficulty, botPlayer.hand, state)
            : undefined,
      };
    }
    return { type: 'PASS' };
  }

  if (playable.length === 0) {
    return { type: 'DRAW' };
  }

  // EASY: Picks any legal card randomly
  if (difficulty === 'easy') {
    const card = pickRandom(playable);
    return {
      type: 'PLAY',
      cardId: card.id,
      chosenColor:
        card.color === 'wild' ? pickRandom(ALL_COLORS) : undefined,
    };
  }

  // NORMAL: Prioritizes matching color, high-point/number cards, saves wilds for last
  if (difficulty === 'normal') {
    const scored = playable.map((card) => {
      let score = 0;
      if (card.color === state.activeColor) score += 20;
      if (card.color !== 'wild') score += 15;
      if (card.value === 'draw2' || card.value === 'skip' || card.value === 'reverse') {
        score += 10;
      }
      if (card.value === 'wild') score -= 12;
      if (card.value === 'wild4') score -= 18;
      score += getCardPoints(card) * 0.2;
      return { card, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0].card;

    return {
      type: 'PLAY',
      cardId: chosen.id,
      chosenColor:
        chosen.color === 'wild'
          ? getDominantColorInHand(
              botPlayer.hand.filter((c) => c.id !== chosen.id)
            )
          : undefined,
    };
  }

  // HARD: Strategic evaluation considering next opponent's card count, turn order,
  // dominant hand colors, and aggressive/defensive special card timing.
  const nextOpponent = getNextTurnPlayer(state, 1);
  const prevOpponent = getNextTurnPlayer(state, -1);
  const nextIsThreat = nextOpponent.hand.length <= 2;
  const anyOpponentNearWin = state.players.some(
    (p) => p.id !== botPlayer.id && p.hand.length <= 2
  );

  // Count color frequencies in remaining hand
  const colorCounts: Record<CardColor, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    blue: 0,
  };
  for (const c of botPlayer.hand) {
    if (c.color !== 'wild') {
      colorCounts[c.color] += 1;
    }
  }

  const scored = playable.map((card) => {
    let score = 0;

    // 1. Aggressive disruption when next opponent is close to winning
    if (nextIsThreat) {
      if (card.value === 'wild4') score += 70;
      if (card.value === 'draw2') score += 62;
      if (card.value === 'skip') score += 50;
      if (card.value === 'reverse') {
        // In 2-player, Reverse acts like Skip! In 3+, only good if prev opponent has MORE cards
        if (state.players.length === 2) {
          score += 50;
        } else if (prevOpponent.hand.length > nextOpponent.hand.length) {
          score += 36;
        } else {
          score -= 10;
        }
      }
    }

    // 2. When stacking is active, prefer Draw2 over Wild4 so Wild4 stays flexible
    if (state.pendingDrawCount > 0) {
      if (card.value === 'draw2') score += 40;
      if (card.value === 'wild4') score += 20;
    }

    // 3. Favor switching to or maintaining bot's dominant color
    if (card.color !== 'wild') {
      score += colorCounts[card.color] * 7;
      if (card.color === state.activeColor) {
        score += 12;
      }
    }

    // 4. Shed high-point cards earlier if opponents are near winning
    if (anyOpponentNearWin) {
      score += getCardPoints(card) * 0.6;
    } else {
      // Otherwise conserve Wild and Wild +4 for emergencies
      if (card.value === 'wild') score -= 24;
      if (card.value === 'wild4') score -= 35;
      score += getCardPoints(card) * 0.25;
    }

    // 5. If bot has 2 cards left and one is Wild, play the non-wild card first or keep Wild as closer!
    if (botPlayer.hand.length === 2 && card.color !== 'wild') {
      score += 28;
    }

    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const chosen = scored[0].card;

  return {
    type: 'PLAY',
    cardId: chosen.id,
    chosenColor:
      chosen.color === 'wild'
        ? chooseWildColor(difficulty, botPlayer.hand.filter((c) => c.id !== chosen.id), state)
        : undefined,
  };
}

function chooseWildColor(
  difficulty: BotDifficulty,
  remainingHand: readonly UnoCard[],
  state: GameState
): CardColor {
  if (difficulty === 'easy') {
    return pickRandom(ALL_COLORS);
  }

  if (remainingHand.length === 0) {
    return state.activeColor;
  }

  // Normal & Hard pick dominant color in remaining hand; Hard breaks ties using action cards
  const scores: Record<CardColor, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    blue: 0,
  };

  for (const card of remainingHand) {
    if (card.color !== 'wild') {
      scores[card.color] += 10;
      if (difficulty === 'hard') {
        if (card.value === 'draw2' || card.value === 'skip' || card.value === 'reverse') {
          scores[card.color] += 3;
        }
      }
    }
  }

  let bestColor: CardColor = ALL_COLORS[0];
  let bestScore = -1;
  for (const color of ALL_COLORS) {
    if (scores[color] > bestScore) {
      bestScore = scores[color];
      bestColor = color;
    }
  }

  return bestColor;
}
