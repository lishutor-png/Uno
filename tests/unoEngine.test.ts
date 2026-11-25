import test from 'node:test';
import assert from 'node:assert/strict';
import { createStandardDeck, drawCardsFromPiles } from '../src/engine/deck.ts';
import {
  applyCallUno,
  applyCatchUnoPenalty,
  applyDrawCard,
  applyPassAfterDraw,
  applyPlayCard,
  createSinglePlayerMatch,
  getClientVisibleState,
} from '../src/engine/gameEngine.ts';
import {
  CLASSIC_RULES,
  DEFAULT_HOUSE_RULES,
  calculateHandPoints,
  isCardPlayable,
} from '../src/engine/rules.ts';
import { decideBotMove } from '../src/engine/botAi.ts';
import { BotDifficulty, GameState, RoomRuleConfig, UnoCard } from '../src/engine/types.ts';
import { DEFAULT_PREFERENCES } from '../src/storage/localStorageAdapter.ts';
import { resolveTargetOrientation } from '../src/utilities/orientationManager.ts';

function totalCardsInGame(state: GameState): number {
  const inHands = state.players.reduce((sum, p) => sum + p.hand.length, 0);
  return inHands + state.drawPile.length + state.discardPile.length;
}

test('Deck standar memiliki tepat 108 kartu sesuai aturan UNO', () => {
  const deck = createStandardDeck();
  assert.equal(deck.length, 108);

  const wilds = deck.filter((c) => c.value === 'wild');
  const wild4s = deck.filter((c) => c.value === 'wild4');
  const zeroes = deck.filter((c) => c.value === '0');
  const draw2s = deck.filter((c) => c.value === 'draw2');

  assert.equal(wilds.length, 4);
  assert.equal(wild4s.length, 4);
  assert.equal(zeroes.length, 4);
  assert.equal(draw2s.length, 8);
});

test('Pembagian awal 7 kartu valid untuk 2 hingga 8 pemain dan menjaga total 108 kartu', () => {
  for (let count = 2; count <= 8; count += 1) {
    const state = createSinglePlayerMatch({
      playerName: 'Tester',
      totalPlayers: count,
      botDifficulty: 'normal',
      rules: CLASSIC_RULES,
    });

    assert.equal(state.players.length, count);
    for (const player of state.players) {
      assert.equal(player.hand.length, 7);
    }
    assert.equal(state.discardPile.length, 1);
    assert.equal(totalCardsInGame(state), 108);
    assert.ok(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(state.discardPile[0].value));
  }
});

test('Aturan Classic: Reverse pada 2 pemain berfungsi sebagai Skip', () => {
  const state = createSinglePlayerMatch({
    playerName: 'Tester',
    totalPlayers: 2,
    botDifficulty: 'easy',
    rules: CLASSIC_RULES,
  });

  const reverseCard: UnoCard = { id: 'test_rev', color: 'red', value: 'reverse' };
  const seeded: GameState = {
    ...state,
    activeColor: 'red',
    discardPile: [{ id: 'top_red_5', color: 'red', value: '5' }],
    players: state.players.map((p, i) =>
      i === 0 ? { ...p, hand: [reverseCard, { id: 'extra', color: 'blue', value: '2' }] } : p
    ),
  };

  const res = applyPlayCard(seeded, seeded.players[0].id, reverseCard.id);
  assert.equal(res.error, undefined);
  assert.equal(res.state.currentTurnIndex, 0);
  assert.equal(res.state.direction, -1);
});

test('House Rules: Stacking +2 dan larangan/izin tumpuk silang +2 & +4', () => {
  const baseState = createSinglePlayerMatch({
    playerName: 'Tester',
    totalPlayers: 3,
    botDifficulty: 'normal',
    rules: { ...DEFAULT_HOUSE_RULES, stackPlus2AndPlus4: false },
  });

  const p0Draw2: UnoCard = { id: 'p0_d2', color: 'green', value: 'draw2' };
  const p1Draw2: UnoCard = { id: 'p1_d2', color: 'red', value: 'draw2' };
  const p1Wild4: UnoCard = { id: 'p1_w4', color: 'wild', value: 'wild4' };
  const p1Num: UnoCard = { id: 'p1_num', color: 'green', value: '7' };

  const seeded: GameState = {
    ...baseState,
    activeColor: 'green',
    discardPile: [{ id: 'top_g3', color: 'green', value: '3' }],
    players: [
      { ...baseState.players[0], hand: [p0Draw2, { id: 'p0_k', color: 'green', value: '1' }] },
      { ...baseState.players[1], hand: [p1Draw2, p1Wild4, p1Num] },
      baseState.players[2],
    ],
  };

  const afterP0 = applyPlayCard(seeded, seeded.players[0].id, p0Draw2.id).state;
  assert.equal(afterP0.pendingDrawCount, 2);
  assert.equal(afterP0.currentTurnIndex, 1);

  // Without cross-stacking: +2 is playable on +2, Wild4 & green 7 are NOT
  assert.equal(isCardPlayable(p1Draw2, afterP0, afterP0.players[1].hand), true);
  assert.equal(isCardPlayable(p1Wild4, afterP0, afterP0.players[1].hand), false);
  assert.equal(isCardPlayable(p1Num, afterP0, afterP0.players[1].hand), false);

  // With cross-stacking enabled: Wild4 IS playable on +2
  const crossEnabledState: GameState = {
    ...afterP0,
    rules: { ...afterP0.rules, stackPlus2AndPlus4: true },
  };
  assert.equal(isCardPlayable(p1Wild4, crossEnabledState, crossEnabledState.players[1].hand), true);
});

test('Pengocokan ulang discard pile ketika draw pile habis', () => {
  const drawPile: UnoCard[] = [{ id: 'last_draw', color: 'blue', value: '4' }];
  const discardPile: UnoCard[] = [
    { id: 'd1', color: 'red', value: '1' },
    { id: 'd2', color: 'yellow', value: '2' },
    { id: 'd3', color: 'green', value: '3' },
    { id: 'top', color: 'blue', value: '9' },
  ];

  const outcome = drawCardsFromPiles(drawPile, discardPile, 3);
  assert.equal(outcome.drawn.length, 3);
  assert.equal(outcome.didReshuffle, true);
  assert.equal(outcome.nextDiscardPile.length, 1);
  assert.equal(outcome.nextDiscardPile[0].id, 'top');
  assert.equal(outcome.nextDrawPile.length, 1);
});

test('Penalti lupa menekan UNO dan perlindungan setelah menekan UNO', () => {
  const baseState = createSinglePlayerMatch({
    playerName: 'Tester',
    totalPlayers: 2,
    botDifficulty: 'hard',
    rules: DEFAULT_HOUSE_RULES,
  });

  const c1: UnoCard = { id: 'c1', color: 'red', value: '4' };
  const c2: UnoCard = { id: 'c2', color: 'red', value: '8' };

  const seeded: GameState = {
    ...baseState,
    activeColor: 'red',
    discardPile: [{ id: 'top_r1', color: 'red', value: '1' }],
    players: [
      { ...baseState.players[0], hand: [c1, c2], calledUno: false },
      baseState.players[1],
    ],
  };

  // Play down to 1 card WITHOUT calling UNO
  const afterPlay = applyPlayCard(seeded, seeded.players[0].id, c1.id).state;
  assert.equal(afterPlay.players[0].hand.length, 1);
  assert.equal(afterPlay.players[0].vulnerableToUnoPenalty, true);

  // Bot catches human -> human receives +2 cards
  const afterPenalty = applyCatchUnoPenalty(
    afterPlay,
    afterPlay.players[1].id,
    afterPlay.players[0].id
  ).state;
  assert.equal(afterPenalty.players[0].hand.length, 3);
  assert.equal(afterPenalty.players[0].vulnerableToUnoPenalty, false);

  // Calling UNO beforehand protects player
  const withUno = applyCallUno(seeded, seeded.players[0].id).state;
  const afterProtectedPlay = applyPlayCard(withUno, withUno.players[0].id, c1.id).state;
  assert.equal(afterProtectedPlay.players[0].vulnerableToUnoPenalty, false);
});

test('Proyeksi keamanan multiplayer menyembunyikan isi kartu pemain lain', () => {
  const state = createSinglePlayerMatch({
    playerName: 'Host',
    totalPlayers: 4,
    botDifficulty: 'normal',
    rules: CLASSIC_RULES,
  });

  const visible = getClientVisibleState(state, state.players[0].id);
  assert.equal(visible.selfHand.length, 7);
  assert.equal(visible.players.length, 4);
  for (const summary of visible.players) {
    assert.equal('hand' in summary, false);
    assert.equal(summary.cardCount, 7);
  }
});

test('Simulasi permainan penuh sampai selesai (2, 4, dan 8 pemain; Classic & House Rules; Easy/Normal/Hard)', () => {
  const scenarios: Array<{
    totalPlayers: number;
    difficulty: BotDifficulty;
    rules: RoomRuleConfig;
  }> = [
    { totalPlayers: 2, difficulty: 'easy', rules: CLASSIC_RULES },
    { totalPlayers: 4, difficulty: 'normal', rules: DEFAULT_HOUSE_RULES },
    {
      totalPlayers: 6,
      difficulty: 'hard',
      rules: { ...DEFAULT_HOUSE_RULES, stackPlus2AndPlus4: true },
    },
    { totalPlayers: 8, difficulty: 'hard', rules: CLASSIC_RULES },
  ];

  for (const scenario of scenarios) {
    let state = createSinglePlayerMatch({
      playerName: 'SimBot',
      totalPlayers: scenario.totalPlayers,
      botDifficulty: scenario.difficulty,
      rules: scenario.rules,
    });

    // Convert player 0 to a bot for automated full-match simulation
    state = {
      ...state,
      players: state.players.map((p, idx) =>
        idx === 0 ? { ...p, isBot: true, botDifficulty: scenario.difficulty } : p
      ),
    };

    let safetySteps = 0;
    const maxSteps = 2000;

    while (!state.winnerId && safetySteps < maxSteps) {
      safetySteps += 1;
      const actor = state.players[state.currentTurnIndex];
      const decision = decideBotMove(state, actor);

      if (decision.type === 'PLAY') {
        if (actor.hand.length === 2) {
          state = applyCallUno(state, actor.id).state;
        }
        const outcome = applyPlayCard(
          state,
          actor.id,
          decision.cardId,
          decision.chosenColor,
          `act_${safetySteps}`
        );
        assert.equal(outcome.error, undefined);
        state = outcome.state;
      } else if (decision.type === 'DRAW') {
        const outcome = applyDrawCard(state, actor.id, `act_${safetySteps}`);
        assert.equal(outcome.error, undefined);
        state = outcome.state;
      } else {
        const outcome = applyPassAfterDraw(state, actor.id);
        assert.equal(outcome.error, undefined);
        state = outcome.state;
      }
    }

    assert.ok(
      state.winnerId !== null,
      `Match dengan ${scenario.totalPlayers} pemain (${scenario.difficulty}) harus selesai dalam ${maxSteps} langkah`
    );
    assert.ok(state.matchResult !== null);
    assert.equal(totalCardsInGame(state), 108);

    const winner = state.players.find((p) => p.id === state.winnerId);
    assert.ok(winner);
    assert.equal(winner.hand.length, 0);

    const expectedTotalPoints = state.players
      .filter((p) => p.id !== winner.id)
      .reduce((sum, p) => sum + calculateHandPoints(p.hand), 0);
    assert.equal(state.matchResult.totalPointsEarned, expectedTotalPoints);
  }
});

test('Resolusi orientasi otomatis berdasarkan mode game & preferensi pengguna', () => {
  assert.equal(DEFAULT_PREFERENCES.orientationPreference, 'auto');

  assert.equal(resolveTargetOrientation('MAIN_MENU', 4, 'auto'), 'portrait');
  assert.equal(resolveTargetOrientation('MODE_SELECT', 6, 'auto'), 'portrait');
  assert.equal(resolveTargetOrientation('GAME_BOARD', 4, 'auto'), 'portrait');
  assert.equal(resolveTargetOrientation('GAME_BOARD', 8, 'auto'), 'portrait');
  assert.equal(resolveTargetOrientation('MULTIPLAYER_GAME_BOARD', 2, 'auto'), 'auto');
  assert.equal(resolveTargetOrientation('MULTIPLAYER_GAME_BOARD', 4, 'auto'), 'auto');
  assert.equal(resolveTargetOrientation('MULTIPLAYER_GAME_BOARD', 5, 'auto'), 'landscape');
  assert.equal(resolveTargetOrientation('MULTIPLAYER_GAME_BOARD', 8, 'auto'), 'landscape');

  assert.equal(resolveTargetOrientation('GAME_BOARD', 4, 'landscape'), 'landscape');
  assert.equal(resolveTargetOrientation('MULTIPLAYER_GAME_BOARD', 8, 'portrait'), 'portrait');
});
