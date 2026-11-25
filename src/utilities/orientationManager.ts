import { getUnoOrientationPlugin } from '../multiplayer/nativeBridge';
import { OrientationPreference } from '../storage/types';

export type TargetOrientation = 'portrait' | 'landscape' | 'auto';

export type OrientableScreen =
  | 'SPLASH'
  | 'MAIN_MENU'
  | 'MODE_SELECT'
  | 'MULTIPLAYER_LOBBY'
  | 'WIFI_DIRECT'
  | 'HOST_ROOM'
  | 'QR_SCANNER'
  | 'JOIN_ROOM'
  | 'GAME_BOARD'
  | 'MULTIPLAYER_GAME_BOARD'
  | 'SETTINGS'
  | 'MATCH_RESULT';

/**
 * Resolves ideal screen orientation by game mode & player count:
 * - Main Menu & Single Player: Portrait
 * - Multiplayer 2–4 players: Portrait or Landscape (auto)
 * - Multiplayer 5–8 players: Landscape
 */
export function resolveTargetOrientation(
  screen: OrientableScreen,
  playerCount: number,
  preference: OrientationPreference
): TargetOrientation {
  if (preference === 'portrait') return 'portrait';
  if (preference === 'landscape') return 'landscape';

  switch (screen) {
    case 'SPLASH':
    case 'MAIN_MENU':
    case 'MODE_SELECT':
    case 'SETTINGS':
    case 'MATCH_RESULT':
    case 'GAME_BOARD':
      return 'portrait';
    case 'MULTIPLAYER_GAME_BOARD':
      return playerCount >= 5 ? 'landscape' : 'auto';
    default:
      return 'auto';
  }
}

export async function applyScreenOrientation(
  target: TargetOrientation
): Promise<void> {
  // 1. Android Capacitor Native Orientation Plugin (UnoOrientationPlugin.kt)
  const nativePlugin = getUnoOrientationPlugin();
  if (nativePlugin) {
    try {
      await nativePlugin.setOrientation({ mode: target });
    } catch {
      // Ignore transient plugin errors
    }
  }

  // 2. Web ScreenOrientation API best-effort (no-op on desktop/unfullscreen browsers)
  if (typeof window !== 'undefined' && 'screen' in window) {
    const orientationApi = window.screen.orientation as
      | (ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
          unlock?: () => void;
        })
      | undefined;

    if (!orientationApi) return;

    try {
      if (target === 'auto') {
        orientationApi.unlock?.();
      } else if (orientationApi.lock) {
        await orientationApi.lock(target);
      }
    } catch {
      // Browsers outside Android APK/fullscreen silently reject lock()
    }
  }
}
