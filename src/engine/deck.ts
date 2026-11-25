import { CardColor, NumberValue, UnoCard } from './types';

const COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];
const NON_ZERO_NUMBERS: NumberValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Generates a standard 108-card UNO deck:
 * - Per color (4): one 0, two each of 1-9, two Skip, two Reverse, two Draw Two (25 * 4 = 100)
 * - Wild: four Wild, four Wild Draw Four (8)
 */
export function createStandardDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let seq = 0;

  const pushCard = (color: UnoCard['color'], value: UnoCard['value']) => {
    seq += 1;
    deck.push({
      id: `card_${seq}_${color}_${value}`,
      color,
      value,
    });
  };

  for (const color of COLORS) {
    pushCard(color, '0');

    for (const num of NON_ZERO_NUMBERS) {
      pushCard(color, num);
      pushCard(color, num);
    }

    for (let i = 0; i < 2; i += 1) {
      pushCard(color, 'skip');
      pushCard(color, 'reverse');
      pushCard(color, 'draw2');
    }
  }

  for (let i = 0; i < 4; i += 1) {
    pushCard('wild', 'wild');
    pushCard('wild', 'wild4');
  }

  return deck;
}

/**
 * Unbiased Fisher-Yates shuffle returning a new array.
 */
export function shuffleDeck<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Draws up to `count` cards from `drawPile`.
 * If `drawPile` runs out and `discardPile` has > 1 cards underneath the top card,
 * reshuffles those underlying discard cards back into a fresh drawPile.
 */
export function drawCardsFromPiles(
  drawPile: readonly UnoCard[],
  discardPile: readonly UnoCard[],
  count: number
): {
  drawn: UnoCard[];
  nextDrawPile: UnoCard[];
  nextDiscardPile: UnoCard[];
  didReshuffle: boolean;
} {
  let currentDraw = [...drawPile];
  let currentDiscard = [...discardPile];
  const drawn: UnoCard[] = [];
  let didReshuffle = false;

  for (let i = 0; i < count; i += 1) {
    if (currentDraw.length === 0) {
      if (currentDiscard.length <= 1) {
        // No more cards left anywhere to draw
        break;
      }
      const topCard = currentDiscard[currentDiscard.length - 1];
      const recyclable = currentDiscard.slice(0, currentDiscard.length - 1);
      currentDraw = shuffleDeck(recyclable);
      currentDiscard = [topCard];
      didReshuffle = true;
    }

    const nextCard = currentDraw.pop();
    if (nextCard) {
      drawn.push(nextCard);
    }
  }

  return {
    drawn,
    nextDrawPile: currentDraw,
    nextDiscardPile: currentDiscard,
    didReshuffle,
  };
}
