import { useCallback, useEffect, useRef, useState } from 'react';
import { LandscapeGuard } from './components/LandscapeGuard';
import {
  ClientVisibleGameState,
  MatchResult,
  SinglePlayerSetupConfig,
} from './engine/types';
import { HostRoomManager } from './multiplayer/hostRoomManager';
import { LanClientState, LanWebSocketClient } from './multiplayer/lanClient';
import {
  getUnoLocalServerPlugin,
  getUnoWifiDirectPlugin,
} from './multiplayer/nativeBridge';
import {
  ConnectionMethod,
  QRConnectionPayload,
  WifiDirectGroupInfo,
} from './multiplayer/types';
import { GameBoardScreen } from './screens/GameBoardScreen';
import { HostRoomScreen } from './screens/HostRoomScreen';
import { JoinRoomScreen } from './screens/JoinRoomScreen';
import { LobbyMultiplayerScreen } from './screens/LobbyMultiplayerScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { MatchResultScreen } from './screens/MatchResultScreen';
import { ModeSelectScreen } from './screens/ModeSelectScreen';
import { MultiplayerGameBoardScreen } from './screens/MultiplayerGameBoardScreen';
import { QrScannerScreen } from './screens/QrScannerScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SplashScreen } from './screens/SplashScreen';
import { WifiDirectScreen } from './screens/WifiDirectScreen';
import { storageService } from './storage/localStorageAdapter';
import {
  HandLayoutMode,
  MatchHistoryRecord,
  UserPreferences,
} from './storage/types';
import { soundEngine } from './utilities/soundEngine';
import {
  applyFullscreen,
  isNativeAndroidRuntime,
} from './utilities/fullscreenManager';
import {
  applyScreenOrientation,
  resolveTargetOrientation,
} from './utilities/orientationManager';

type AppScreen =
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

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('SPLASH');
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    storageService.loadPreferences()
  );
  const [matchHistory, setMatchHistory] = useState<MatchHistoryRecord[]>(() =>
    storageService.loadMatchHistory()
  );

  const [activeMatchConfig, setActiveMatchConfig] =
    useState<SinglePlayerSetupConfig>(() => ({
      playerName: preferences.playerName,
      totalPlayers: preferences.defaultPlayerCount,
      botDifficulty: preferences.defaultBotDifficulty,
      rules: preferences.defaultRules,
    }));
  const [matchSessionNonce, setMatchSessionNonce] = useState(1);
  const [lastMatchResult, setLastMatchResult] = useState<MatchResult | null>(
    null
  );
  const [lastMatchOrigin, setLastMatchOrigin] = useState<
    'SINGLE_PLAYER' | 'MULTIPLAYER_LAN'
  >('SINGLE_PLAYER');

  const [scannedQrPayload, setScannedQrPayload] =
    useState<QRConnectionPayload | null>(null);
  const [hostConnectionMethod, setHostConnectionMethod] =
    useState<ConnectionMethod>('WIFI_LAN');
  const [wifiDirectGroupInfo, setWifiDirectGroupInfo] =
    useState<WifiDirectGroupInfo | null>(null);
  const [wifiDirectHostIp, setWifiDirectHostIp] = useState<string | null>(null);

  // Active LAN Multiplayer session refs in state
  const [lanSession, setLanSession] = useState<{
    role: 'HOST' | 'CLIENT';
    hostManager?: HostRoomManager | null;
    lanClient?: LanWebSocketClient | null;
    teardownHostListeners?: () => Promise<void>;
    initialView: ClientVisibleGameState;
    initialClientState?: LanClientState | null;
  } | null>(null);
  const cleanupInProgressRef = useRef(false);

  useEffect(() => {
    soundEngine.setEnabled(preferences.soundEnabled);
  }, [preferences.soundEnabled]);

  const activePlayerCount =
    screen === 'MULTIPLAYER_GAME_BOARD' && lanSession
      ? lanSession.initialView.players.length
      : activeMatchConfig.totalPlayers;

  const targetOrientation = resolveTargetOrientation(
    screen,
    activePlayerCount,
    preferences.orientationPreference
  );

  useEffect(() => {
    void applyScreenOrientation(targetOrientation);
  }, [targetOrientation]);

  useEffect(() => {
    if (isNativeAndroidRuntime()) {
      void applyFullscreen(true);
    }
  }, []);

  const updatePreferences = useCallback((partial: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next: UserPreferences = { ...prev, ...partial };
      storageService.savePreferences(next);
      return next;
    });
  }, []);

  const handleToggleSound = useCallback(() => {
    setPreferences((prev) => {
      const nextSound = !prev.soundEnabled;
      soundEngine.setEnabled(nextSound);
      if (nextSound) {
        soundEngine.playButtonTap();
      }
      const next = { ...prev, soundEnabled: nextSound };
      storageService.savePreferences(next);
      return next;
    });
  }, []);

  const handleChangeHandLayout = useCallback(
    (mode: HandLayoutMode) => {
      soundEngine.playButtonTap();
      updatePreferences({ handLayoutMode: mode });
    },
    [updatePreferences]
  );

  const handleLaunchMatch = useCallback(
    (config: SinglePlayerSetupConfig) => {
      soundEngine.playButtonTap();
      updatePreferences({
        playerName: config.playerName,
        defaultPlayerCount: config.totalPlayers,
        defaultBotDifficulty: config.botDifficulty,
        defaultRules: config.rules,
      });
      setActiveMatchConfig(config);
      setLastMatchOrigin('SINGLE_PLAYER');
      setLastMatchResult(null);
      setMatchSessionNonce((n) => n + 1);
      setScreen('GAME_BOARD');
    },
    [updatePreferences]
  );

  const cleanupLanSession = useCallback(
    async (closeReason = 'Room selesai. Kembali ke lobi.', removeP2pGroup = false) => {
      if (cleanupInProgressRef.current) return;
      const current = lanSession;
      if (!current) return;

      cleanupInProgressRef.current = true;
      setLanSession(null);

      try {
        if (current.role === 'HOST') {
          current.hostManager?.closeRoom(closeReason);
          await current.teardownHostListeners?.().catch(() => {});
          const serverPlugin = getUnoLocalServerPlugin();
          await serverPlugin?.removeAllListeners().catch(() => {});
          await serverPlugin?.stopServer().catch(() => {});
          if (removeP2pGroup) {
            await getUnoWifiDirectPlugin()?.removeGroup().catch(() => {});
          }
        } else if (current.role === 'CLIENT') {
          current.lanClient?.leaveRoom();
          current.lanClient?.destroy();
        }
      } finally {
        cleanupInProgressRef.current = false;
      }
    },
    [lanSession]
  );

  const handleMatchFinish = useCallback(
    (result: MatchResult) => {
      setLastMatchResult(result);
      const record: MatchHistoryRecord = {
        id: `hist_${Date.now()}`,
        playedAt: Date.now(),
        mode: lastMatchOrigin,
        totalPlayers: result.playerScores.length,
        botDifficulty:
          lastMatchOrigin === 'SINGLE_PLAYER'
            ? activeMatchConfig.botDifficulty
            : undefined,
        rulePreset: activeMatchConfig.rules.preset,
        winnerName: result.winnerName,
        playerWon: !result.winnerIsBot,
        pointsEarned: result.totalPointsEarned,
        durationSeconds: result.durationSeconds,
      };
      setMatchHistory(storageService.appendMatchHistory(record));
      if (lastMatchOrigin === 'MULTIPLAYER_LAN') {
        void cleanupLanSession('Permainan selesai. Kembali ke lobi.', false);
      }
      setScreen('MATCH_RESULT');
    },
    [activeMatchConfig, lastMatchOrigin, cleanupLanSession]
  );

  const handlePlayAgain = useCallback(() => {
    soundEngine.playButtonTap();
    setLastMatchResult(null);
    if (lastMatchOrigin === 'MULTIPLAYER_LAN') {
      setScreen('MULTIPLAYER_LOBBY');
      return;
    }
    setMatchSessionNonce((n) => n + 1);
    setScreen('GAME_BOARD');
  }, [lastMatchOrigin]);

  const handleClearHistory = useCallback(() => {
    soundEngine.playButtonTap();
    storageService.clearMatchHistory();
    setMatchHistory([]);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-[#062417]">
      <LandscapeGuard requiredOrientation={targetOrientation} />
      {screen === 'SPLASH' && (
        <SplashScreen onComplete={() => setScreen('MAIN_MENU')} />
      )}

      {screen === 'MAIN_MENU' && (
        <MainMenuScreen
          playerName={preferences.playerName}
          soundEnabled={preferences.soundEnabled}
          matchHistory={matchHistory}
          onChangePlayerName={(name) => updatePreferences({ playerName: name })}
          onToggleSound={handleToggleSound}
          onStartSinglePlayer={() => {
            soundEngine.playButtonTap();
            setScreen('MODE_SELECT');
          }}
          onOpenMultiplayer={() => {
            soundEngine.playButtonTap();
            setScreen('MULTIPLAYER_LOBBY');
          }}
          onOpenSettings={() => {
            soundEngine.playButtonTap();
            setScreen('SETTINGS');
          }}
        />
      )}

      {screen === 'MODE_SELECT' && (
        <ModeSelectScreen
          playerName={preferences.playerName}
          initialTotalPlayers={preferences.defaultPlayerCount}
          initialDifficulty={preferences.defaultBotDifficulty}
          initialRules={preferences.defaultRules}
          onBack={() => {
            soundEngine.playButtonTap();
            setScreen('MAIN_MENU');
          }}
          onLaunchMatch={handleLaunchMatch}
        />
      )}

      {screen === 'MULTIPLAYER_LOBBY' && (
        <LobbyMultiplayerScreen
          onBack={() => {
            soundEngine.playButtonTap();
            setScreen('MAIN_MENU');
          }}
          onOpenHostRoom={() => {
            soundEngine.playButtonTap();
            setHostConnectionMethod('WIFI_LAN');
            setWifiDirectGroupInfo(null);
            setScreen('HOST_ROOM');
          }}
          onOpenQrScanner={() => {
            soundEngine.playButtonTap();
            setScreen('QR_SCANNER');
          }}
          onOpenJoinManual={() => {
            soundEngine.playButtonTap();
            setScannedQrPayload(null);
            setWifiDirectHostIp(null);
            setScreen('JOIN_ROOM');
          }}
          onOpenWifiDirect={() => {
            soundEngine.playButtonTap();
            setScreen('WIFI_DIRECT');
          }}
        />
      )}

      {screen === 'WIFI_DIRECT' && (
        <WifiDirectScreen
          onBack={() => {
            soundEngine.playButtonTap();
            setScreen('MULTIPLAYER_LOBBY');
          }}
          onProceedAsHost={(groupInfo) => {
            soundEngine.playButtonTap();
            setHostConnectionMethod('WIFI_DIRECT');
            setWifiDirectGroupInfo(groupInfo);
            setScreen('HOST_ROOM');
          }}
          onProceedAsClientManual={(groupOwnerIp) => {
            soundEngine.playButtonTap();
            setScannedQrPayload(null);
            setWifiDirectHostIp(groupOwnerIp);
            setScreen('JOIN_ROOM');
          }}
          onProceedAsClientScanner={() => {
            soundEngine.playButtonTap();
            setScreen('QR_SCANNER');
          }}
        />
      )}

      {screen === 'QR_SCANNER' && (
        <QrScannerScreen
          onBack={() => {
            soundEngine.playButtonTap();
            setScreen('MULTIPLAYER_LOBBY');
          }}
          onManualJoin={() => {
            soundEngine.playButtonTap();
            setScannedQrPayload(null);
            setScreen('JOIN_ROOM');
          }}
          onQrDecoded={(payload) => {
            soundEngine.playButtonTap();
            setScannedQrPayload(payload);
            setScreen('JOIN_ROOM');
          }}
        />
      )}

      {screen === 'HOST_ROOM' && (
        <HostRoomScreen
          playerName={preferences.playerName}
          initialTotalPlayers={preferences.defaultPlayerCount}
          initialDifficulty={preferences.defaultBotDifficulty}
          initialRules={preferences.defaultRules}
          connectionMethod={hostConnectionMethod}
          wifiDirectInfo={wifiDirectGroupInfo}
          onBack={() => {
            soundEngine.playButtonTap();
            setScreen(
              hostConnectionMethod === 'WIFI_DIRECT'
                ? 'WIFI_DIRECT'
                : 'MULTIPLAYER_LOBBY'
            );
          }}
          onGameStarted={(manager, _room, initialView, detachListeners) => {
            setLastMatchOrigin('MULTIPLAYER_LAN');
            setLanSession({
              role: 'HOST',
              hostManager: manager,
              teardownHostListeners: detachListeners,
              initialView,
            });
            setScreen('MULTIPLAYER_GAME_BOARD');
          }}
        />
      )}

      {screen === 'JOIN_ROOM' && (
        <JoinRoomScreen
          playerName={preferences.playerName}
          initialQrPayload={scannedQrPayload}
          initialHostIp={wifiDirectHostIp}
          onBack={() => {
            soundEngine.playButtonTap();
            setScannedQrPayload(null);
            setWifiDirectHostIp(null);
            setScreen('MULTIPLAYER_LOBBY');
          }}
          onOpenScanner={() => {
            soundEngine.playButtonTap();
            setScreen('QR_SCANNER');
          }}
          onGameStarted={(client, clientState) => {
            if (!clientState.gameState) return;
            setLastMatchOrigin('MULTIPLAYER_LAN');
            setLanSession({
              role: 'CLIENT',
              lanClient: client,
              initialView: clientState.gameState,
              initialClientState: clientState,
            });
            setScreen('MULTIPLAYER_GAME_BOARD');
          }}
        />
      )}

      {screen === 'GAME_BOARD' && (
        <GameBoardScreen
          key={matchSessionNonce}
          config={activeMatchConfig}
          soundEnabled={preferences.soundEnabled}
          handLayoutMode={preferences.handLayoutMode}
          onToggleSound={handleToggleSound}
          onChangeHandLayout={handleChangeHandLayout}
          onMatchFinish={handleMatchFinish}
          onExitToMenu={() => {
            soundEngine.playButtonTap();
            setScreen('MAIN_MENU');
          }}
        />
      )}

      {screen === 'MULTIPLAYER_GAME_BOARD' && lanSession && (
        <MultiplayerGameBoardScreen
          role={lanSession.role}
          hostManager={lanSession.hostManager}
          lanClient={lanSession.lanClient}
          initialView={lanSession.initialView}
          initialClientState={lanSession.initialClientState}
          soundEnabled={preferences.soundEnabled}
          handLayoutMode={preferences.handLayoutMode}
          onToggleSound={handleToggleSound}
          onChangeHandLayout={handleChangeHandLayout}
          onMatchFinish={handleMatchFinish}
          onExitToMenu={() => {
            soundEngine.playButtonTap();
            void cleanupLanSession(
              'Room telah diakhiri oleh Host. Kembali ke lobi.',
              true
            );
            setScreen('MULTIPLAYER_LOBBY');
          }}
        />
      )}

      {screen === 'SETTINGS' && (
        <SettingsScreen
          preferences={preferences}
          matchHistory={matchHistory}
          onUpdatePreferences={updatePreferences}
          onClearHistory={handleClearHistory}
          onBack={() => {
            soundEngine.playButtonTap();
            setScreen('MAIN_MENU');
          }}
        />
      )}

      {screen === 'MATCH_RESULT' && lastMatchResult && (
        <MatchResultScreen
          result={lastMatchResult}
          isMultiplayer={lastMatchOrigin === 'MULTIPLAYER_LAN'}
          onPlayAgain={handlePlayAgain}
          onBackToMenu={() => {
            soundEngine.playButtonTap();
            setScreen('MAIN_MENU');
          }}
        />
      )}
    </div>
  );
}
