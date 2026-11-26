import { useCallback, useEffect, useState } from 'react';
import {
  getNativeMultiplayerCapabilities,
  getUnoOrientationPlugin,
} from '../multiplayer/nativeBridge';

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

let nativeFullscreenActive = true;
const listeners = new Set<(active: boolean) => void>();

function notifyListeners(active: boolean): void {
  for (const cb of listeners) {
    cb(active);
  }
}

export function isNativeAndroidRuntime(): boolean {
  return getNativeMultiplayerCapabilities().isAndroidCapacitor;
}

export function isWebFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  const el = document.documentElement as FullscreenElement;
  const enabledFlag = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? true;
  return Boolean(enabledFlag && (el.requestFullscreen || el.webkitRequestFullscreen));
}

export function getIsFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  if (isNativeAndroidRuntime()) {
    return nativeFullscreenActive;
  }
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export async function applyFullscreen(enabled: boolean): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const nativePlugin = getUnoOrientationPlugin();
  if (isNativeAndroidRuntime() && nativePlugin?.setFullscreen) {
    try {
      const res = await nativePlugin.setFullscreen({ enabled });
      nativeFullscreenActive = res.applied ? res.enabled : enabled;
      notifyListeners(nativeFullscreenActive);
      return nativeFullscreenActive;
    } catch {
      return nativeFullscreenActive;
    }
  }

  const doc = document as FullscreenDocument;
  const root = document.documentElement as FullscreenElement;

  try {
    if (enabled) {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        notifyListeners(true);
        return true;
      }
      if (root.requestFullscreen) {
        await root.requestFullscreen({ navigationUI: 'hide' }).catch(async () => {
          await root.requestFullscreen();
        });
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      } else {
        return false;
      }
      notifyListeners(getIsFullscreenActive());
      return getIsFullscreenActive();
    } else {
      if (doc.exitFullscreen && doc.fullscreenElement) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
        await doc.webkitExitFullscreen();
      }
      notifyListeners(getIsFullscreenActive());
      return false;
    }
  } catch {
    return getIsFullscreenActive();
  }
}

export function useFullscreen(): {
  isFullscreen: boolean;
  canToggleFullscreen: boolean;
  isNativeAndroid: boolean;
  toggleFullscreen: () => Promise<void>;
} {
  const isNativeAndroid = isNativeAndroidRuntime();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
    getIsFullscreenActive()
  );

  useEffect(() => {
    const onNativeChange = (active: boolean) => setIsFullscreen(active);
    listeners.add(onNativeChange);

    const onDocChange = () => setIsFullscreen(getIsFullscreenActive());
    document.addEventListener('fullscreenchange', onDocChange);
    document.addEventListener('webkitfullscreenchange', onDocChange);

    return () => {
      listeners.delete(onNativeChange);
      document.removeEventListener('fullscreenchange', onDocChange);
      document.removeEventListener('webkitfullscreenchange', onDocChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const next = !getIsFullscreenActive();
    await applyFullscreen(next);
  }, []);

  return {
    isFullscreen,
    canToggleFullscreen: isNativeAndroid || isWebFullscreenSupported(),
    isNativeAndroid,
    toggleFullscreen,
  };
}
