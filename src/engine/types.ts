export type CardColor = 'red' | 'yellow' | 'green' | 'blue';
export type WildColor = CardColor | 'wild';

export type NumberValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type ActionValue = 'skip' | 'reverse' | 'draw2';
export type WildValue = 'wild' | 'wild4';
export type CardValue = NumberValue | ActionValue | WildValue;

export interface UnoCard {
  id: string;
  color: WildColor;
  value: CardValue;
}

export type RulePreset = 'CLASSIC' | 'HOUSE_RULES';

export interface RoomRuleConfig {
  preset: RulePreset;
  stackPlus2: boolean;
  stackPlus4: boolean;
  stackPlus2AndPlus4: boolean;
  unoPenalty: boolean;
}

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export type PlayDirection = 1 | -1; // 1 = clockwise, -1 = counter-clockwise

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  avatarColor: string;
  hand: UnoCard[];
  calledUno: boolean;
  /** True when player dropped to 1 card without pressing UNO and is still catchable */
  vulnerableToUnoPenalty: boolean;
}

export interface PlayerSummary {
  id: string;
  name: string;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  avatarColor: string;
  cardCount: number;
  calledUno: boolean;
  vulnerableToUnoPenalty: boolean;
}

export type SpecialEffectType =
  | 'SKIP'
  | 'REVERSE'
  | 'DRAW2'
  | 'WILD'
  | 'WILD4'
  | 'UNO'
  | 'PENALTY'
  | 'RESHUFFLE';

export interface GameEventLog {
  id: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  type:
    | 'GAME_START'
    | 'PLAY_CARD'
    | 'DRAW_CARD'
    | 'PASS_TURN'
    | 'CALL_UNO'
    | 'UNO_PENALTY'
    | 'RESHUFFLE'
    | 'GAME_OVER';
  message: string;
  effectType?: SpecialEffectType;
  chosenColor?: CardColor;
}

export interface PlayerMatchScore {
  playerId: string;
  playerName: string;
  isBot: boolean;
  remainingCards: number;
  handPoints: number;
  isWinner: boolean;
}

export interface MatchResult {
  winnerId: string;
  winnerName: string;
  winnerIsBot: boolean;
  totalPointsEarned: number;
  durationSeconds: number;
  playerScores: PlayerMatchScore[];
}

export interface GameState {
  matchId: string;
  rules: RoomRuleConfig;
  players: Player[];
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  activeColor: CardColor;
  direction: PlayDirection;
  currentTurnIndex: number;
  pendingDrawCount: number;
  /** Tracks which card type started or sustained the draw stack */
  pendingDrawType: 'draw2' | 'wild4' | null;
  /** After drawing 1 card on normal turn, player may play that drawn card or pass */
  hasDrawnThisTurn: boolean;
  drawnCardIdThisTurn: string | null;
  turnCount: number;
  startedAt: number;
  winnerId: string | null;
  matchResult: MatchResult | null;
  lastEvent: GameEventLog | null;
  processedActionIds: string[];
}

/**
 * Security-isolated projection sent to a specific client in multiplayer mode.
 * Never includes other players' card objects.
 */
export interface ClientVisibleGameState {
  matchId: string;
  rules: RoomRuleConfig;
  selfPlayerId: string;
  selfHand: UnoCard[];
  selfCalledUno: boolean;
  players: PlayerSummary[];
  topDiscard: UnoCard;
  discardCount: number;
  drawPileCount: number;
  activeColor: CardColor;
  direction: PlayDirection;
  currentTurnPlayerId: string;
  pendingDrawCount: number;
  pendingDrawType: 'draw2' | 'wild4' | null;
  hasDrawnThisTurn: boolean;
  drawnCardIdThisTurn: string | null;
  turnCount: number;
  winnerId: string | null;
  matchResult: MatchResult | null;
  lastEvent: GameEventLog | null;
}

export interface SinglePlayerSetupConfig {
  playerName: string;
  totalPlayers: number; // 2..8
  botDifficulty: BotDifficulty;
  rules: RoomRuleConfig;
}
