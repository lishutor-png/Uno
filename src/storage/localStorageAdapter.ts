import { DEFAULT_HOUSE_RULES } from '../engine/rules';
import {
  MatchHistoryRecord,
  StorageAdapter,
  UserPreferences,
} from './types';

const PREFS_KEY = 'uno_arena_preferences_v1';
const HISTORY_KEY = 'uno_arena_match_history_v1';
const MAX_HISTORY_ITEMS = 30;

export const DEFAULT_PREFERENCES: UserPreferences = {
  playerName: 'Pemain 1',
  soundEnabled: true,
  handLayoutMode: 'fan',
  orientationPreference: 'auto',
  defaultPlayerCount: 4,
  defaultBotDifficulty: 'normal',
  defaultRules: { ...DEFAULT_HOUSE_RULES },
};

class LocalStorageAdapter implements StorageAdapter {
  loadPreferences(): UserPreferences {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return { ...DEFAULT_PREFERENCES };
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        defaultRules: {
          ...DEFAULT_PREFERENCES.defaultRules,
          ...(parsed.defaultRules ?? {}),
        },
      };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  savePreferences(prefs: UserPreferences): void {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage quota errors in restricted sandboxes
    }
  }

  loadMatchHistory(): MatchHistoryRecord[] {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  appendMatchHistory(record: MatchHistoryRecord): MatchHistoryRecord[] {
    const existing = this.loadMatchHistory();
    const updated = [record, ...existing].slice(0, MAX_HISTORY_ITEMS);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
    return updated;
  }

  clearMatchHistory(): void {
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}

export const storageService: StorageAdapter = new LocalStorageAdapter();
