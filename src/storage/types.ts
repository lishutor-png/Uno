import { BotDifficulty, RoomRuleConfig } from '../engine/types';

export type HandLayoutMode = 'fan' | 'stack';
export type OrientationPreference = 'auto' | 'portrait' | 'landscape';

export interface UserPreferences {
  playerName: string;
  soundEnabled: boolean;
  handLayoutMode: HandLayoutMode;
  orientationPreference: OrientationPreference;
  defaultPlayerCount: number;
  defaultBotDifficulty: BotDifficulty;
  defaultRules: RoomRuleConfig;
}

export interface MatchHistoryRecord {
  id: string;
  playedAt: number;
  mode: 'SINGLE_PLAYER' | 'MULTIPLAYER_LAN' | 'MULTIPLAYER_WIFI_DIRECT';
  totalPlayers: number;
  botDifficulty?: BotDifficulty;
  rulePreset: RoomRuleConfig['preset'];
  winnerName: string;
  playerWon: boolean;
  pointsEarned: number;
  durationSeconds: number;
}

export interface StorageAdapter {
  loadPreferences(): UserPreferences;
  savePreferences(prefs: UserPreferences): void;
  loadMatchHistory(): MatchHistoryRecord[];
  appendMatchHistory(record: MatchHistoryRecord): MatchHistoryRecord[];
  clearMatchHistory(): void;
}
