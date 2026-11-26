import {
  BotDifficulty,
  CardColor,
  ClientVisibleGameState,
  GameEventLog,
  MatchResult,
  PlayerSummary,
  PlayDirection,
  RoomRuleConfig,
  UnoCard,
} from '../engine/types';

export type ConnectionMethod = 'WIFI_LAN' | 'WIFI_DIRECT';

export type QrTokenType = 'PERSISTENT_ROOM' | 'SINGLE_GAME';

/**
 * QR payload strictly contains connection & room auth metadata.
 * Never stores player cards or personal player information.
 */
export interface QRConnectionPayload {
  protocolVersion: 1;
  roomId: string;
  roomCode: string;
  hostIp: string;
  port: number;
  qrType: QrTokenType;
  roomAuthToken: string;
}

export interface SingleGameTokenRecord {
  token: string;
  createdAt: number;
  consumed: boolean;
  usedByPlayerId: string | null;
  usedByPlayerName: string | null;
}

export interface PlayerSession {
  playerId: string;
  sessionId: string;
  reconnectToken: string;
  connectionId: string | null;
  displayName: string;
  isHost: boolean;
  isSpectator: boolean;
  connected: boolean;
  disconnectedAt: number | null;
  lastHeartbeatAt: number;
}

export interface RoomParticipantSummary {
  playerId: string;
  displayName: string;
  isHost: boolean;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  connected: boolean;
}

export interface RoomPublicSnapshot {
  roomId: string;
  roomCode: string;
  maxPlayers: number;
  hostMode: 'PLAYER' | 'SPECTATOR';
  fillEmptyWithBots: boolean;
  botDifficulty: BotDifficulty;
  rules: RoomRuleConfig;
  status: 'LOBBY' | 'IN_GAME' | 'FINISHED' | 'CLOSED';
  participants: RoomParticipantSummary[];
  disconnectedPlayerIds?: string[];
}

export interface MultiplayerRoomConfig {
  roomId: string;
  roomCode: string;
  roomAuthToken: string;
  maxPlayers: number; // 2..8
  hostMode: 'PLAYER' | 'SPECTATOR';
  hostName: string;
  fillEmptyWithBots: boolean;
  botDifficulty: BotDifficulty;
  connectionMethod: ConnectionMethod;
  port: number;
  rules: RoomRuleConfig;
}

export type GameActionPayload =
  | { type: 'PLAY_CARD'; cardId: string; chosenColor?: CardColor }
  | { type: 'DRAW_CARD' }
  | { type: 'PASS_TURN' }
  | { type: 'CALL_UNO' }
  | { type: 'CATCH_UNO'; targetPlayerId: string };

export interface StateDeltaPayload {
  prevVersion: number;
  stateVersion: number;
  roomStatus?: RoomPublicSnapshot['status'];
  participantUpdates?: RoomParticipantSummary[];
  selfHand?: UnoCard[];
  selfCalledUno?: boolean;
  players?: PlayerSummary[];
  topDiscard?: UnoCard;
  discardCount?: number;
  drawPileCount?: number;
  activeColor?: CardColor;
  direction?: PlayDirection;
  currentTurnPlayerId?: string;
  pendingDrawCount?: number;
  pendingDrawType?: 'draw2' | 'wild4' | null;
  hasDrawnThisTurn?: boolean;
  drawnCardIdThisTurn?: string | null;
  turnCount?: number;
  winnerId?: string | null;
  matchResult?: MatchResult | null;
  lastEvent?: GameEventLog | null;
  pausedByDisconnect?: boolean;
  pausedPlayerNames?: string[];
  disconnectedPlayerIds?: string[];
}

export type ClientToHostMessage =
  | {
      type: 'JOIN_REQUEST';
      roomId?: string;
      roomCode: string;
      roomAuthToken: string;
      qrType?: QrTokenType;
      playerName: string;
      reconnectToken?: string;
    }
  | {
      type: 'PING';
      sessionId: string;
      clientTime: number;
    }
  | {
      type: 'GAME_ACTION';
      sessionId: string;
      actionId: string;
      actionSeq?: number;
      action: GameActionPayload;
    }
  | {
      type: 'RESYNC_REQUEST';
      sessionId: string;
    }
  | {
      type: 'LEAVE_ROOM';
      sessionId: string;
    };

export type HostToClientMessage =
  | {
      type: 'JOIN_ACCEPTED';
      playerId: string;
      sessionId: string;
      reconnectToken: string;
      room: RoomPublicSnapshot;
      gameState: ClientVisibleGameState | null;
    }
  | {
      type: 'JOIN_REJECTED';
      reason: string;
    }
  | {
      type: 'PONG';
      clientTime: number;
      serverTime: number;
    }
  | {
      type: 'ROOM_UPDATE';
      room: RoomPublicSnapshot;
    }
  | {
      type: 'STATE_SYNC';
      room: RoomPublicSnapshot;
      gameState: ClientVisibleGameState;
    }
  | {
      type: 'STATE_DELTA';
      delta: StateDeltaPayload;
    }
  | {
      type: 'ACTION_REJECTED';
      actionId: string;
      reason: string;
    }
  | {
      type: 'KICKED';
      reason: string;
    }
  | {
      type: 'ROOM_CLOSED';
      reason: string;
    };

export interface NativeCapabilityStatus {
  isAndroidCapacitor: boolean;
  localWebSocketServerSupported: boolean;
  wifiDirectSupported: boolean;
  cameraQrSupported: boolean;
  reason: string;
}

export interface HostServerTransport {
  sendToClient(connectionId: string, payload: string): Promise<boolean> | boolean;
  kickClient(connectionId: string, reason: string): Promise<void> | void;
}

export type WifiDirectPeerStatus =
  | 'AVAILABLE'
  | 'INVITED'
  | 'CONNECTED'
  | 'FAILED'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

export interface WifiDirectPeer {
  deviceName: string;
  deviceAddress: string;
  status: WifiDirectPeerStatus;
  primaryDeviceType?: string;
  isGroupOwner?: boolean;
}

export interface WifiDirectGroupInfo {
  groupFormed: boolean;
  isGroupOwner: boolean;
  groupOwnerAddress: string;
  networkName: string;
  passphrase?: string;
  clients: WifiDirectPeer[];
}

export interface WifiDirectErrorEvent {
  code: string;
  message: string;
}

