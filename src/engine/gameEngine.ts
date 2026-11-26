import { createStandardDeck, drawCardsFromPiles, shuffleDeck } from './deck';
import { calculateHandPoints, isCardPlayable } from './rules';
import {
  BotDifficulty,
  CardColor,
  ClientVisibleGameState,
  GameEventLog,
  GameState,
  MatchResult,
  Player,
  PlayerMatchScore,
  PlayDirection,
  SinglePlayerSetupConfig,
  SpecialEffectType,
  UnoCard,
} from './types';
import { BOT_PROFILES } from '../utilities/cardHelpers';

const COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];

function makeEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function wrapIndex(index: number, total: number): number {
  return ((index % total) + total) % total;
}

function advanceIndex(
  currentIndex: number,
  direction: PlayDirection,
  steps: number,
  totalPlayers: number
): number {
  return wrapIndex(currentIndex + direction * steps, totalPlayers);
}

/**
 * Creates a fresh UNO match state with shuffled deck, 7 cards dealt per player,
 * and a valid starting top discard card.
 */
export function createSinglePlayerMatch(config: SinglePlayerSetupConfig): GameState {
  const clampedPlayers = Math.max(2, Math.min(8, config.totalPlayers));
  const cleanName = config.playerName.trim() || 'Pemain 1';

  const players: Player[] = [
    {
      id: 'player_human',
      name: cleanName,
      isBot: false,
      avatarColor: '#10b981',
      hand: [],
      calledUno: false,
      vulnerableToUnoPenalty: false,
    },
  ];

  for (let i = 0; i < clampedPlayers - 1; i += 1) {
    const profile = BOT_PROFILES[i % BOT_PROFILES.length];
    players.push({
      id: `bot_${i + 1}`,
      name: profile.name,
      isBot: true,
      botDifficulty: config.botDifficulty as BotDifficulty,
      avatarColor: profile.color,
      hand: [],
      calledUno: false,
      vulnerableToUnoPenalty: false,
    });
  }

  let deck = shuffleDeck(createStandardDeck());

  // Deal 7 cards to each player
  for (let round = 0; round < 7; round += 1) {
    for (let p = 0; p < players.length; p += 1) {
      const card = deck.pop();
      if (card) {
        players[p].hand.push(card);
      }
    }
  }

  // Pick a clean starting number card (0-9) so Turn 1 begins fairly
  const isActionOrWild = (c: UnoCard) =>
    c.color === 'wild' ||
    c.value === 'skip' ||
    c.value === 'reverse' ||
    c.value === 'draw2';

  let firstCard = deck.pop()!;
  while (isActionOrWild(firstCard)) {
    deck.unshift(firstCard);
    deck = shuffleDeck(deck);
    firstCard = deck.pop()!;
  }

  const activeColor: CardColor =
    firstCard.color === 'wild'
      ? COLORS[Math.floor(Math.random() * COLORS.length)]
      : firstCard.color;

  return {
    matchId: `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    rules: { ...config.rules },
    players,
    drawPile: deck,
    discardPile: [firstCard],
    activeColor,
    direction: 1,
    currentTurnIndex: 0,
    pendingDrawCount: 0,
    pendingDrawType: null,
    hasDrawnThisTurn: false,
    drawnCardIdThisTurn: null,
    turnCount: 1,
    startedAt: Date.now(),
    winnerId: null,
    matchResult: null,
    lastEvent: {
      id: makeEventId(),
      timestamp: Date.now(),
      actorId: 'system',
      actorName: 'Arena',
      type: 'GAME_START',
      message: `Pertandingan dimulai (${clampedPlayers} pemain). Giliran ${players[0].name}.`,
    },
    processedActionIds: [],
  };
}

function buildMatchResult(state: GameState, winner: Player): MatchResult {
  let totalPointsEarned = 0;
  const playerScores: PlayerMatchScore[] = state.players.map((player) => {
    const pts = player.id === winner.id ? 0 : calculateHandPoints(player.hand);
    totalPointsEarned += pts;
    return {
      playerId: player.id,
      playerName: player.name,
      isBot: player.isBot,
      remainingCards: player.hand.length,
      handPoints: pts,
      isWinner: player.id === winner.id,
    };
  });

  // Sort: winner first, then fewest cards / fewest points
  playerScores.sort((a, b) => {
    if (a.isWinner) return -1;
    if (b.isWinner) return 1;
    if (a.remainingCards !== b.remainingCards) {
      return a.remainingCards - b.remainingCards;
    }
    return a.handPoints - b.handPoints;
  });

  return {
    winnerId: winner.id,
    winnerName: winner.name,
    winnerIsBot: winner.isBot,
    totalPointsEarned,
    durationSeconds: Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)),
    playerScores,
  };
}

/**
 * Validates and applies a PLAY_CARD action. Pure function returning a new GameState.
 */
export function applyPlayCard(
  state: GameState,
  playerId: string,
  cardId: string,
  chosenColor?: CardColor,
  actionId?: string
): { state: GameState; error?: string } {
  if (state.winnerId) {
    return { state, error: 'Pertandingan sudah berakhir.' };
  }
  if (actionId && state.processedActionIds.includes(actionId)) {
    return { state, error: 'Aksi duplikat diabaikan.' };
  }

  const currentPlayer = state.players[state.currentTurnIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return { state, error: 'Bukan giliran pemain ini.' };
  }

  const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { state, error: 'Kartu tidak ditemukan di tangan.' };
  }

  const card = currentPlayer.hand[cardIndex];
  if (!isCardPlayable(card, state, currentPlayer.hand)) {
    return { state, error: 'Kartu tidak memenuhi aturan permainan.' };
  }

  if (card.color === 'wild' && !chosenColor) {
    return { state, error: 'Pilih warna untuk kartu Wild.' };
  }

  const nextActiveColor: CardColor =
    card.color === 'wild' ? chosenColor! : card.color;

  // Remove card from player's hand
  const updatedHand = currentPlayer.hand.filter((c) => c.id !== cardId);
  const nextDiscardPile = [...state.discardPile, card];
  let nextDrawPile = [...state.drawPile];
  let mutableDiscardPile = nextDiscardPile;

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx !== state.currentTurnIndex) return p;
    const droppedToOne = updatedHand.length === 1;
    const vulnerable = droppedToOne && !p.calledUno && state.rules.unoPenalty;
    return {
      ...p,
      hand: updatedHand,
      calledUno: updatedHand.length === 1 ? p.calledUno : false,
      vulnerableToUnoPenalty: vulnerable,
    };
  });

  const actorAfterPlay = updatedPlayers[state.currentTurnIndex];

  // Check immediate win condition
  if (updatedHand.length === 0) {
    const intermediateState: GameState = {
      ...state,
      players: updatedPlayers,
      drawPile: nextDrawPile,
      discardPile: mutableDiscardPile,
      activeColor: nextActiveColor,
      pendingDrawCount: 0,
      pendingDrawType: null,
      hasDrawnThisTurn: false,
      drawnCardIdThisTurn: null,
      winnerId: actorAfterPlay.id,
      processedActionIds: actionId
        ? [...state.processedActionIds.slice(-49), actionId]
        : state.processedActionIds,
    };

    const matchResult = buildMatchResult(intermediateState, actorAfterPlay);
    return {
      state: {
        ...intermediateState,
        matchResult,
        lastEvent: {
          id: makeEventId(),
          timestamp: Date.now(),
          actorId: actorAfterPlay.id,
          actorName: actorAfterPlay.name,
          type: 'GAME_OVER',
          message: `${actorAfterPlay.name} memenangkan pertandingan!`,
        },
      },
    };
  }

  // Apply special card effects
  let nextDirection: PlayDirection = state.direction;
  let stepCount = 1;
  let nextPendingDrawCount = state.pendingDrawCount;
  let nextPendingDrawType = state.pendingDrawType;
  let effectType: SpecialEffectType | undefined;
  let effectMessage = `${actorAfterPlay.name} memainkan kartu.`;
  let targetPlayerId: string | undefined;
  let targetPlayerName: string | undefined;

  const totalPlayers = updatedPlayers.length;

  if (card.value === 'reverse') {
    nextDirection = (state.direction * -1) as PlayDirection;
    effectType = 'REVERSE';
    if (totalPlayers === 2) {
      // Official 2-player UNO rule: Reverse acts like Skip
      stepCount = 2;
      const skippedIndex = advanceIndex(
        state.currentTurnIndex,
        nextDirection,
        1,
        totalPlayers
      );
      targetPlayerId = updatedPlayers[skippedIndex].id;
      targetPlayerName = updatedPlayers[skippedIndex].name;
      effectMessage = `${actorAfterPlay.name} memainkan Reverse (berlaku seperti Skip)!`;
    } else {
      effectMessage = `${actorAfterPlay.name} membalik arah permainan!`;
    }
  } else if (card.value === 'skip') {
    stepCount = 2;
    effectType = 'SKIP';
    const skippedIndex = advanceIndex(
      state.currentTurnIndex,
      nextDirection,
      1,
      totalPlayers
    );
    targetPlayerId = updatedPlayers[skippedIndex].id;
    targetPlayerName = updatedPlayers[skippedIndex].name;
    effectMessage = `${updatedPlayers[skippedIndex].name} dilewati (Skip)!`;
  } else if (card.value === 'draw2') {
    effectType = 'DRAW2';
    const victimIndex = advanceIndex(
      state.currentTurnIndex,
      nextDirection,
      1,
      totalPlayers
    );
    targetPlayerId = updatedPlayers[victimIndex].id;
    targetPlayerName = updatedPlayers[victimIndex].name;
    if (state.rules.stackPlus2) {
      nextPendingDrawCount += 2;
      nextPendingDrawType = 'draw2';
      effectMessage = `${actorAfterPlay.name} menumpuk +2 (Total +${nextPendingDrawCount})!`;
    } else {
      // Classic rule: next player immediately draws 2 and loses turn
      const drawOutcome = drawCardsFromPiles(nextDrawPile, mutableDiscardPile, 2);
      nextDrawPile = drawOutcome.nextDrawPile;
      mutableDiscardPile = drawOutcome.nextDiscardPile;
      updatedPlayers[victimIndex] = {
        ...updatedPlayers[victimIndex],
        hand: [...updatedPlayers[victimIndex].hand, ...drawOutcome.drawn],
        calledUno: false,
        vulnerableToUnoPenalty: false,
      };
      stepCount = 2;
      effectMessage = `${updatedPlayers[victimIndex].name} mengambil +2 kartu & dilewati!`;
    }
  } else if (card.value === 'wild4') {
    effectType = 'WILD4';
    const victimIndex = advanceIndex(
      state.currentTurnIndex,
      nextDirection,
      1,
      totalPlayers
    );
    targetPlayerId = updatedPlayers[victimIndex].id;
    targetPlayerName = updatedPlayers[victimIndex].name;
    if (state.rules.stackPlus4) {
      nextPendingDrawCount += 4;
      nextPendingDrawType = 'wild4';
      effectMessage = `${actorAfterPlay.name} memainkan Wild +4 (Total +${nextPendingDrawCount})!`;
    } else {
      const drawOutcome = drawCardsFromPiles(nextDrawPile, mutableDiscardPile, 4);
      nextDrawPile = drawOutcome.nextDrawPile;
      mutableDiscardPile = drawOutcome.nextDiscardPile;
      updatedPlayers[victimIndex] = {
        ...updatedPlayers[victimIndex],
        hand: [...updatedPlayers[victimIndex].hand, ...drawOutcome.drawn],
        calledUno: false,
        vulnerableToUnoPenalty: false,
      };
      stepCount = 2;
      effectMessage = `${updatedPlayers[victimIndex].name} mengambil +4 kartu & dilewati!`;
    }
  } else if (card.value === 'wild') {
    effectType = 'WILD';
    effectMessage = `${actorAfterPlay.name} mengganti warna aktif.`;
  }

  const nextTurnIndex = advanceIndex(
    state.currentTurnIndex,
    nextDirection,
    stepCount,
    totalPlayers
  );

  const event: GameEventLog = {
    id: makeEventId(),
    timestamp: Date.now(),
    actorId: actorAfterPlay.id,
    actorName: actorAfterPlay.name,
    targetPlayerId,
    targetPlayerName,
    type: 'PLAY_CARD',
    message: effectMessage,
    effectType,
    chosenColor: card.color === 'wild' ? nextActiveColor : undefined,
  };

  return {
    state: {
      ...state,
      players: updatedPlayers,
      drawPile: nextDrawPile,
      discardPile: mutableDiscardPile,
      activeColor: nextActiveColor,
      direction: nextDirection,
      currentTurnIndex: nextTurnIndex,
      pendingDrawCount: nextPendingDrawCount,
      pendingDrawType: nextPendingDrawType,
      hasDrawnThisTurn: false,
      drawnCardIdThisTurn: null,
      turnCount: state.turnCount + 1,
      lastEvent: event,
      processedActionIds: actionId
        ? [...state.processedActionIds.slice(-49), actionId]
        : state.processedActionIds,
    },
  };
}

/**
 * Validates and applies drawing from the draw pile:
 * - If pendingDrawCount > 0: player draws all stacked penalty cards and ends turn.
 * - Otherwise: player draws 1 card; if playable, they may play it or pass.
 */
export function applyDrawCard(
  state: GameState,
  playerId: string,
  actionId?: string
): { state: GameState; error?: string } {
  if (state.winnerId) {
    return { state, error: 'Pertandingan sudah berakhir.' };
  }
  if (actionId && state.processedActionIds.includes(actionId)) {
    return { state, error: 'Aksi duplikat diabaikan.' };
  }

  const currentPlayer = state.players[state.currentTurnIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return { state, error: 'Bukan giliran pemain ini.' };
  }

  if (state.hasDrawnThisTurn && state.pendingDrawCount === 0) {
    return { state, error: 'Sudah mengambil kartu pada giliran ini.' };
  }

  const isPenaltyDraw = state.pendingDrawCount > 0;
  const countToDraw = isPenaltyDraw ? state.pendingDrawCount : 1;

  const drawOutcome = drawCardsFromPiles(
    state.drawPile,
    state.discardPile,
    countToDraw
  );

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx !== state.currentTurnIndex) return p;
    return {
      ...p,
      hand: [...p.hand, ...drawOutcome.drawn],
      calledUno: false,
      vulnerableToUnoPenalty: false,
    };
  });

  if (isPenaltyDraw) {
    const nextTurnIndex = advanceIndex(
      state.currentTurnIndex,
      state.direction,
      1,
      updatedPlayers.length
    );

    return {
      state: {
        ...state,
        players: updatedPlayers,
        drawPile: drawOutcome.nextDrawPile,
        discardPile: drawOutcome.nextDiscardPile,
        pendingDrawCount: 0,
        pendingDrawType: null,
        hasDrawnThisTurn: false,
        drawnCardIdThisTurn: null,
        currentTurnIndex: nextTurnIndex,
        turnCount: state.turnCount + 1,
        lastEvent: {
          id: makeEventId(),
          timestamp: Date.now(),
          actorId: currentPlayer.id,
          actorName: currentPlayer.name,
          type: 'DRAW_CARD',
          message: `${currentPlayer.name} mengambil +${drawOutcome.drawn.length} kartu penalti.`,
          effectType: drawOutcome.didReshuffle ? 'RESHUFFLE' : undefined,
        },
        processedActionIds: actionId
          ? [...state.processedActionIds.slice(-49), actionId]
          : state.processedActionIds,
      },
    };
  }

  // Normal single card draw
  const drawnCard = drawOutcome.drawn[0] ?? null;

  // If deck & discard completely exhausted and 0 cards drawn, auto-pass
  if (!drawnCard) {
    const nextTurnIndex = advanceIndex(
      state.currentTurnIndex,
      state.direction,
      1,
      updatedPlayers.length
    );
    return {
      state: {
        ...state,
        players: updatedPlayers,
        drawPile: drawOutcome.nextDrawPile,
        discardPile: drawOutcome.nextDiscardPile,
        hasDrawnThisTurn: false,
        drawnCardIdThisTurn: null,
        currentTurnIndex: nextTurnIndex,
        turnCount: state.turnCount + 1,
        lastEvent: {
          id: makeEventId(),
          timestamp: Date.now(),
          actorId: currentPlayer.id,
          actorName: currentPlayer.name,
          type: 'PASS_TURN',
          message: `Kartu deck habis. Giliran ${currentPlayer.name} dilewati.`,
        },
      },
    };
  }

  const nextStateCandidate: GameState = {
    ...state,
    players: updatedPlayers,
    drawPile: drawOutcome.nextDrawPile,
    discardPile: drawOutcome.nextDiscardPile,
    hasDrawnThisTurn: true,
    drawnCardIdThisTurn: drawnCard.id,
    lastEvent: {
      id: makeEventId(),
      timestamp: Date.now(),
      actorId: currentPlayer.id,
      actorName: currentPlayer.name,
      type: 'DRAW_CARD',
      message: `${currentPlayer.name} mengambil 1 kartu.`,
      effectType: drawOutcome.didReshuffle ? 'RESHUFFLE' : undefined,
    },
    processedActionIds: actionId
      ? [...state.processedActionIds.slice(-49), actionId]
      : state.processedActionIds,
  };

  // Check if drawn card can actually be played; if NOT playable, auto-advance turn cleanly!
  const updatedSelfHand = updatedPlayers[state.currentTurnIndex].hand;
  const canPlayDrawn = isCardPlayable(
    drawnCard,
    nextStateCandidate,
    updatedSelfHand
  );

  if (!canPlayDrawn) {
    const nextTurnIndex = advanceIndex(
      state.currentTurnIndex,
      state.direction,
      1,
      updatedPlayers.length
    );
    return {
      state: {
        ...nextStateCandidate,
        hasDrawnThisTurn: false,
        drawnCardIdThisTurn: null,
        currentTurnIndex: nextTurnIndex,
        turnCount: state.turnCount + 1,
      },
    };
  }

  return { state: nextStateCandidate };
}

/**
 * Ends turn after drawing a playable card if the player chooses to keep it.
 */
export function applyPassAfterDraw(
  state: GameState,
  playerId: string,
  actionId?: string
): { state: GameState; error?: string } {
  if (state.winnerId) {
    return { state, error: 'Pertandingan sudah berakhir.' };
  }
  if (actionId && state.processedActionIds.includes(actionId)) {
    return { state, error: 'Aksi duplikat diabaikan.' };
  }
  const currentPlayer = state.players[state.currentTurnIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return { state, error: 'Bukan giliran pemain ini.' };
  }
  if (!state.hasDrawnThisTurn) {
    return { state, error: 'Ambil kartu terlebih dahulu sebelum melewati giliran.' };
  }

  const nextTurnIndex = advanceIndex(
    state.currentTurnIndex,
    state.direction,
    1,
    state.players.length
  );

  return {
    state: {
      ...state,
      hasDrawnThisTurn: false,
      drawnCardIdThisTurn: null,
      currentTurnIndex: nextTurnIndex,
      turnCount: state.turnCount + 1,
      lastEvent: {
        id: makeEventId(),
        timestamp: Date.now(),
        actorId: currentPlayer.id,
        actorName: currentPlayer.name,
        type: 'PASS_TURN',
        message: `${currentPlayer.name} menyimpan kartu dan melewati giliran.`,
      },
      processedActionIds: actionId
        ? [...state.processedActionIds.slice(-49), actionId]
        : state.processedActionIds,
    },
  };
}

/**
 * Player presses UNO! when holding 2 cards (about to play) or 1 card (before caught).
 */
export function applyCallUno(
  state: GameState,
  playerId: string,
  actionId?: string
): { state: GameState; error?: string } {
  if (actionId && state.processedActionIds.includes(actionId)) {
    return { state, error: 'Aksi duplikat diabaikan.' };
  }
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    return { state, error: 'Pemain tidak ditemukan.' };
  }
  if (player.hand.length > 2) {
    return { state, error: 'UNO hanya dapat ditekan saat sisa 1 atau 2 kartu.' };
  }

  const updatedPlayers = state.players.map((p) =>
    p.id === playerId
      ? { ...p, calledUno: true, vulnerableToUnoPenalty: false }
      : p
  );

  return {
    state: {
      ...state,
      players: updatedPlayers,
      lastEvent: {
        id: makeEventId(),
        timestamp: Date.now(),
        actorId: player.id,
        actorName: player.name,
        type: 'CALL_UNO',
        message: `${player.name} berteriak UNO!`,
        effectType: 'UNO',
      },
      processedActionIds: actionId
        ? [...state.processedActionIds.slice(-49), actionId]
        : state.processedActionIds,
    },
  };
}

/**
 * Catches a player who dropped to 1 card without pressing UNO! (+2 penalty cards).
 */
export function applyCatchUnoPenalty(
  state: GameState,
  catcherId: string,
  targetPlayerId: string,
  actionId?: string
): { state: GameState; error?: string } {
  if (actionId && state.processedActionIds.includes(actionId)) {
    return { state, error: 'Aksi duplikat diabaikan.' };
  }
  if (!state.rules.unoPenalty) {
    return { state, error: 'Aturan penalti UNO tidak aktif.' };
  }

  const target = state.players.find((p) => p.id === targetPlayerId);
  const catcher = state.players.find((p) => p.id === catcherId);
  if (!target || !catcher) {
    return { state, error: 'Pemain tidak ditemukan.' };
  }

  if (!target.vulnerableToUnoPenalty || target.hand.length !== 1) {
    return { state, error: 'Pemain tidak dalam kondisi penalti UNO.' };
  }

  const drawOutcome = drawCardsFromPiles(state.drawPile, state.discardPile, 2);
  const updatedPlayers = state.players.map((p) =>
    p.id === targetPlayerId
      ? {
          ...p,
          hand: [...p.hand, ...drawOutcome.drawn],
          calledUno: false,
          vulnerableToUnoPenalty: false,
        }
      : p
  );

  return {
    state: {
      ...state,
      players: updatedPlayers,
      drawPile: drawOutcome.nextDrawPile,
      discardPile: drawOutcome.nextDiscardPile,
      lastEvent: {
        id: makeEventId(),
        timestamp: Date.now(),
        actorId: catcher.id,
        actorName: catcher.name,
        targetPlayerId: target.id,
        targetPlayerName: target.name,
        type: 'UNO_PENALTY',
        message: `${catcher.name} menangkap ${target.name} lupa UNO! (+2 kartu)`,
        effectType: 'PENALTY',
      },
      processedActionIds: actionId
        ? [...state.processedActionIds.slice(-49), actionId]
        : state.processedActionIds,
    },
  };
}

/**
 * Sorts a hand cleanly by Color (Red, Yellow, Green, Blue, Wild) then Value.
 */
export function sortHandByColor(hand: readonly UnoCard[]): UnoCard[] {
  const colorOrder: Record<UnoCard['color'], number> = {
    red: 0,
    yellow: 1,
    green: 2,
    blue: 3,
    wild: 4,
  };
  const valueOrder: Record<UnoCard['value'], number> = {
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    skip: 10,
    reverse: 11,
    draw2: 12,
    wild: 13,
    wild4: 14,
  };

  return [...hand].sort((a, b) => {
    if (colorOrder[a.color] !== colorOrder[b.color]) {
      return colorOrder[a.color] - colorOrder[b.color];
    }
    return valueOrder[a.value] - valueOrder[b.value];
  });
}

/**
 * Security boundary projection for future multiplayer sync (Tahap 3+):
 * Extracts only the requesting player's hand and summary counts for everyone else.
 */
export function getClientVisibleState(
  state: GameState,
  selfPlayerId: string
): ClientVisibleGameState {
  const selfPlayer = state.players.find((p) => p.id === selfPlayerId);
  const currentTurnPlayer = state.players[state.currentTurnIndex];

  return {
    matchId: state.matchId,
    rules: state.rules,
    selfPlayerId,
    selfHand: selfPlayer ? [...selfPlayer.hand] : [],
    selfCalledUno: selfPlayer ? selfPlayer.calledUno : false,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      botDifficulty: p.botDifficulty,
      avatarColor: p.avatarColor,
      cardCount: p.hand.length,
      calledUno: p.calledUno,
      vulnerableToUnoPenalty: p.vulnerableToUnoPenalty,
    })),
    topDiscard: state.discardPile[state.discardPile.length - 1],
    discardCount: state.discardPile.length,
    drawPileCount: state.drawPile.length,
    activeColor: state.activeColor,
    direction: state.direction,
    currentTurnPlayerId: currentTurnPlayer ? currentTurnPlayer.id : '',
    pendingDrawCount: state.pendingDrawCount,
    pendingDrawType: state.pendingDrawType,
    hasDrawnThisTurn: state.hasDrawnThisTurn,
    drawnCardIdThisTurn: state.drawnCardIdThisTurn,
    turnCount: state.turnCount,
    winnerId: state.winnerId,
    matchResult: state.matchResult,
    lastEvent: state.lastEvent,
  };
}
