import { ClientVisibleGameState } from '../engine/types';
import {
  ClientToHostMessage,
  GameActionPayload,
  HostToClientMessage,
  QrTokenType,
  RoomPublicSnapshot,
  StateDeltaPayload,
} from './types';

export type LanClientConnectionStatus =
  | 'IDLE'
  | 'CONNECTING'
  | 'AUTHENTICATED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'ERROR';

export interface LanClientState {
  status: LanClientConnectionStatus;
  errorMessage: string | null;
  playerId: string | null;
  sessionId: string | null;
  reconnectToken: string | null;
  room: RoomPublicSnapshot | null;
  gameState: ClientVisibleGameState | null;
  latencyMs: number | null;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  isHostDead: boolean;
  roomClosedByHost: boolean;
}

export interface LanClientOptions {
  hostIp: string;
  port: number;
  roomId?: string;
  roomCode: string;
  roomAuthToken: string;
  qrType?: QrTokenType;
  playerName: string;
  onStateChange: (state: LanClientState) => void;
  onActionRejected?: (reason: string) => void;
  onKickedOrClosed?: (reason: string) => void;
}

interface StoredReconnectMeta {
  roomId?: string;
  roomCode: string;
  roomAuthToken: string;
  reconnectToken: string;
  savedAt: number;
}

const HEARTBEAT_INTERVAL_MS = 3500;
const HEARTBEAT_STALE_MS = 10000;
const RECONNECT_BACKOFF_MS = [1000, 2000, 4000, 8000, 8000, 8000];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_BACKOFF_MS.length;
const RECONNECT_META_TTL_MS = 10 * 60 * 1000;

function getReconnectStorageKey(roomIdOrCode: string): string {
  return `mabar_uno_reconnect_${roomIdOrCode.toUpperCase()}`;
}

function loadStoredReconnectToken(opts: LanClientOptions): string | null {
  try {
    const key = getReconnectStorageKey(opts.roomId || opts.roomCode);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReconnectMeta;
    if (!parsed || typeof parsed.reconnectToken !== 'string') return null;
    if (Date.now() - parsed.savedAt > RECONNECT_META_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    if (
      parsed.roomCode.toUpperCase() !== opts.roomCode.trim().toUpperCase() ||
      parsed.roomAuthToken !== opts.roomAuthToken.trim()
    ) {
      return null;
    }
    if (opts.roomId && parsed.roomId && parsed.roomId !== opts.roomId) {
      return null;
    }
    return parsed.reconnectToken;
  } catch {
    return null;
  }
}

function saveStoredReconnectToken(
  roomIdOrCode: string,
  meta: StoredReconnectMeta
): void {
  try {
    window.sessionStorage.setItem(
      getReconnectStorageKey(roomIdOrCode),
      JSON.stringify(meta)
    );
  } catch {
    // Ignore storage errors in non-browser contexts
  }
}

function removeStoredReconnectToken(roomIdOrCode: string): void {
  try {
    window.sessionStorage.removeItem(getReconnectStorageKey(roomIdOrCode));
  } catch {
    // Ignore
  }
}

function applyDeltaToState(
  prevState: ClientVisibleGameState,
  prevRoom: RoomPublicSnapshot | null,
  delta: StateDeltaPayload
): { nextState: ClientVisibleGameState; nextRoom: RoomPublicSnapshot | null } {
  const nextState: ClientVisibleGameState = {
    ...prevState,
    stateVersion: delta.stateVersion,
  };

  if (delta.selfHand !== undefined) nextState.selfHand = delta.selfHand;
  if (delta.selfCalledUno !== undefined) nextState.selfCalledUno = delta.selfCalledUno;
  if (delta.players !== undefined) nextState.players = delta.players;
  if (delta.topDiscard !== undefined) nextState.topDiscard = delta.topDiscard;
  if (delta.discardCount !== undefined) nextState.discardCount = delta.discardCount;
  if (delta.drawPileCount !== undefined) nextState.drawPileCount = delta.drawPileCount;
  if (delta.activeColor !== undefined) nextState.activeColor = delta.activeColor;
  if (delta.direction !== undefined) nextState.direction = delta.direction;
  if (delta.currentTurnPlayerId !== undefined) {
    nextState.currentTurnPlayerId = delta.currentTurnPlayerId;
  }
  if (delta.pendingDrawCount !== undefined) {
    nextState.pendingDrawCount = delta.pendingDrawCount;
  }
  if (delta.pendingDrawType !== undefined) {
    nextState.pendingDrawType = delta.pendingDrawType;
  }
  if (delta.hasDrawnThisTurn !== undefined) {
    nextState.hasDrawnThisTurn = delta.hasDrawnThisTurn;
  }
  if (delta.drawnCardIdThisTurn !== undefined) {
    nextState.drawnCardIdThisTurn = delta.drawnCardIdThisTurn;
  }
  if (delta.turnCount !== undefined) nextState.turnCount = delta.turnCount;
  if (delta.winnerId !== undefined) nextState.winnerId = delta.winnerId;
  if (delta.matchResult !== undefined) nextState.matchResult = delta.matchResult;
  if (delta.lastEvent !== undefined) nextState.lastEvent = delta.lastEvent;
  if (delta.pausedByDisconnect !== undefined) {
    nextState.pausedByDisconnect = delta.pausedByDisconnect;
  }
  if (delta.pausedPlayerNames !== undefined) {
    nextState.pausedPlayerNames = delta.pausedPlayerNames;
  }
  if (delta.disconnectedPlayerIds !== undefined) {
    nextState.disconnectedPlayerIds = delta.disconnectedPlayerIds;
  }

  let nextRoom = prevRoom;
  if (
    prevRoom &&
    (delta.roomStatus !== undefined ||
      delta.participantUpdates !== undefined ||
      delta.disconnectedPlayerIds !== undefined)
  ) {
    nextRoom = {
      ...prevRoom,
      status: delta.roomStatus ?? prevRoom.status,
      participants: delta.participantUpdates ?? prevRoom.participants,
      disconnectedPlayerIds:
        delta.disconnectedPlayerIds ?? prevRoom.disconnectedPlayerIds,
    };
  }

  return { nextState, nextRoom };
}

export class LanWebSocketClient {
  private opts: LanClientOptions;
  private ws: WebSocket | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private lastPongAt = 0;
  private reconnectAttempts = 0;
  private manuallyClosed = false;
  private actionSeq = 0;
  private lastAppliedStateVersion = 0;
  private socketEpoch = 0;
  private visibilityListener: (() => void) | null = null;

  private state: LanClientState = {
    status: 'IDLE',
    errorMessage: null,
    playerId: null,
    sessionId: null,
    reconnectToken: null,
    room: null,
    gameState: null,
    latencyMs: null,
    reconnectAttempt: 0,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    isHostDead: false,
    roomClosedByHost: false,
  };

  constructor(opts: LanClientOptions) {
    this.opts = opts;
    this.state.reconnectToken = loadStoredReconnectToken(opts);
  }

  private setState(partial: Partial<LanClientState>): void {
    this.state = { ...this.state, ...partial };
    this.opts.onStateChange(this.state);
  }

  private clearAllStoredTokens(): void {
    if (this.state.room?.roomId) {
      removeStoredReconnectToken(this.state.room.roomId);
    }
    if (this.opts.roomId) {
      removeStoredReconnectToken(this.opts.roomId);
    }
    if (this.opts.roomCode) {
      removeStoredReconnectToken(this.opts.roomCode);
    }
  }

  private detachSocket(socket: WebSocket | null): void {
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    try {
      if (
        socket.readyState === WebSocket.CONNECTING ||
        socket.readyState === WebSocket.OPEN
      ) {
        socket.close();
      }
    } catch {
      // Ignore close error
    }
  }

  private attachVisibilityHandler(): void {
    if (
      this.visibilityListener ||
      typeof document === 'undefined' ||
      typeof document.addEventListener !== 'function'
    ) {
      return;
    }
    this.visibilityListener = () => {
      if (document.visibilityState !== 'visible') return;
      if (this.manuallyClosed || this.state.roomClosedByHost) return;

      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.state.sessionId) {
        this.lastPongAt = Date.now();
        this.sendRaw({
          type: 'PING',
          sessionId: this.state.sessionId,
          clientTime: Date.now(),
        });
        if (this.state.gameState && !this.state.gameState.winnerId) {
          this.sendRaw({
            type: 'RESYNC_REQUEST',
            sessionId: this.state.sessionId,
          });
        }
      } else if (
        this.state.sessionId &&
        this.state.reconnectToken &&
        this.state.status === 'DISCONNECTED'
      ) {
        this.reconnectNow();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  private detachVisibilityHandler(): void {
    if (
      this.visibilityListener &&
      typeof document !== 'undefined' &&
      typeof document.removeEventListener === 'function'
    ) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
    }
    this.visibilityListener = null;
  }

  connect(): void {
    this.manuallyClosed = false;
    this.reconnectAttempts = 0;
    this.clearTimers();
    this.attachVisibilityHandler();
    this.openSocket(false);
  }

  /**
   * Manual retry entry point ("COBA SAMBUNGKAN KEMBALI") when connection dropped.
   */
  reconnectNow(): void {
    if (this.state.roomClosedByHost) return;
    if (!this.state.reconnectToken && !this.opts.roomAuthToken) {
      return;
    }
    this.manuallyClosed = false;
    this.reconnectAttempts = 0;
    this.clearTimers();
    this.attachVisibilityHandler();
    this.openSocket(true);
  }

  private openSocket(isReconnect: boolean): void {
    // Strictly detach and close any lingering previous socket to prevent duplicate connections
    this.detachSocket(this.ws);
    this.ws = null;
    this.socketEpoch += 1;
    const epoch = this.socketEpoch;

    this.setState({
      status: isReconnect ? 'RECONNECTING' : 'CONNECTING',
      errorMessage: isReconnect
        ? 'Mencoba menghubungkan kembali...'
        : 'Menghubungkan ke Host...',
      isHostDead: false,
      roomClosedByHost: false,
    });

    const url = `ws://${this.opts.hostIp.trim()}:${this.opts.port}`;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      this.setState({
        status: isReconnect ? 'DISCONNECTED' : 'ERROR',
        errorMessage: `Gagal membuka koneksi WebSocket ke ${url}: ${
          err instanceof Error ? err.message : 'Alamat IP/Port tidak valid'
        }`,
      });
      return;
    }

    this.ws = socket;

    socket.onopen = () => {
      if (this.socketEpoch !== epoch || this.ws !== socket) return;
      this.reconnectAttempts = 0;
      this.lastPongAt = Date.now();
      this.sendRaw({
        type: 'JOIN_REQUEST',
        roomId: this.opts.roomId,
        roomCode: this.opts.roomCode.trim().toUpperCase(),
        roomAuthToken: this.opts.roomAuthToken.trim(),
        qrType: this.opts.qrType,
        playerName: this.opts.playerName.trim() || 'Pemain',
        reconnectToken: this.state.reconnectToken ?? undefined,
      });
    };

    socket.onmessage = (event) => {
      if (this.socketEpoch !== epoch || this.ws !== socket) return;
      try {
        const msg = JSON.parse(String(event.data)) as HostToClientMessage;
        this.handleHostMessage(msg);
      } catch {
        // Ignore malformed JSON frames
      }
    };

    socket.onerror = () => {
      if (this.socketEpoch !== epoch || this.ws !== socket) return;
      if (this.state.status === 'CONNECTING' && !isReconnect) {
        this.setState({
          status: 'ERROR',
          errorMessage: `Tidak dapat menjangkau server Host di ${url}. Pastikan kedua HP berada di Hotspot/Wi-Fi yang sama dan Room sudah dibuka.`,
        });
      }
    };

    socket.onclose = () => {
      if (this.socketEpoch !== epoch || this.ws !== socket) return;
      this.clearHeartbeat();
      this.ws = null;

      if (this.manuallyClosed) {
        if (this.state.status !== 'DISCONNECTED') {
          this.setState({ status: 'DISCONNECTED' });
        }
        return;
      }

      if (
        this.state.sessionId &&
        this.state.reconnectToken &&
        this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
      ) {
        this.scheduleReconnect();
      } else if (this.state.sessionId && this.state.reconnectToken) {
        this.setState({
          status: 'DISCONNECTED',
          isHostDead: true,
          errorMessage:
            'Koneksi terputus. Host belum merespons setelah beberapa percobaan. Periksa Wi-Fi lalu coba sambungkan kembali atau kembali ke lobi.',
        });
      } else if (this.state.status !== 'ERROR') {
        this.setState({
          status: 'DISCONNECTED',
          errorMessage: 'Koneksi terputus dari server Host.',
        });
      }
    };
  }

  private handleHostMessage(msg: HostToClientMessage): void {
    switch (msg.type) {
      case 'JOIN_ACCEPTED': {
        this.lastPongAt = Date.now();
        this.reconnectAttempts = 0;
        if (msg.gameState?.stateVersion !== undefined) {
          this.lastAppliedStateVersion = msg.gameState.stateVersion;
        }
        saveStoredReconnectToken(msg.room.roomId || msg.room.roomCode, {
          roomId: msg.room.roomId,
          roomCode: msg.room.roomCode,
          roomAuthToken: this.opts.roomAuthToken.trim(),
          reconnectToken: msg.reconnectToken,
          savedAt: Date.now(),
        });
        this.setState({
          status: 'AUTHENTICATED',
          errorMessage: null,
          playerId: msg.playerId,
          sessionId: msg.sessionId,
          reconnectToken: msg.reconnectToken,
          room: msg.room,
          gameState: msg.gameState,
          reconnectAttempt: 0,
          isHostDead: false,
          roomClosedByHost: false,
        });
        this.startHeartbeat();
        break;
      }
      case 'JOIN_REJECTED': {
        this.manuallyClosed = true;
        this.clearTimers();
        this.clearAllStoredTokens();
        const socket = this.ws;
        this.ws = null;
        this.detachSocket(socket);
        this.setState({
          status: 'ERROR',
          reconnectToken: null,
          errorMessage: msg.reason,
        });
        break;
      }
      case 'PONG': {
        this.lastPongAt = Date.now();
        const nextLatency = Math.max(1, Date.now() - msg.clientTime);
        if (
          this.state.latencyMs === null ||
          Math.abs(this.state.latencyMs - nextLatency) >= 8
        ) {
          this.setState({ latencyMs: nextLatency });
        }
        break;
      }
      case 'ROOM_UPDATE': {
        this.setState({ room: msg.room });
        break;
      }
      case 'STATE_SYNC': {
        if (msg.gameState.stateVersion !== undefined) {
          this.lastAppliedStateVersion = msg.gameState.stateVersion;
        }
        if (msg.gameState.winnerId) {
          this.clearAllStoredTokens();
        }
        this.setState({
          room: msg.room,
          gameState: msg.gameState,
        });
        break;
      }
      case 'STATE_DELTA': {
        const currentGame = this.state.gameState;
        if (
          !currentGame ||
          msg.delta.prevVersion !== this.lastAppliedStateVersion
        ) {
          if (this.state.sessionId) {
            this.sendRaw({
              type: 'RESYNC_REQUEST',
              sessionId: this.state.sessionId,
            });
          }
          break;
        }
        const { nextState, nextRoom } = applyDeltaToState(
          currentGame,
          this.state.room,
          msg.delta
        );
        this.lastAppliedStateVersion = msg.delta.stateVersion;
        if (nextState.winnerId) {
          this.clearAllStoredTokens();
        }
        this.setState({
          room: nextRoom,
          gameState: nextState,
        });
        break;
      }
      case 'ACTION_REJECTED': {
        this.opts.onActionRejected?.(msg.reason);
        break;
      }
      case 'KICKED':
      case 'ROOM_CLOSED': {
        this.manuallyClosed = true;
        this.clearTimers();
        this.detachVisibilityHandler();
        this.clearAllStoredTokens();
        const isClosed = msg.type === 'ROOM_CLOSED';
        this.opts.onKickedOrClosed?.(msg.reason);
        this.setState({
          status: 'DISCONNECTED',
          reconnectToken: null,
          sessionId: null,
          isHostDead: isClosed,
          roomClosedByHost: isClosed,
          errorMessage: msg.reason,
        });
        break;
      }
    }
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (
        !this.ws ||
        this.ws.readyState !== WebSocket.OPEN ||
        !this.state.sessionId
      ) {
        return;
      }
      if (Date.now() - this.lastPongAt > HEARTBEAT_STALE_MS) {
        this.ws.close();
        return;
      }
      this.sendRaw({
        type: 'PING',
        sessionId: this.state.sessionId,
        clientTime: Date.now(),
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts += 1;
    const delayMs =
      RECONNECT_BACKOFF_MS[
        Math.min(this.reconnectAttempts - 1, RECONNECT_BACKOFF_MS.length - 1)
      ];
    this.setState({
      status: 'RECONNECTING',
      reconnectAttempt: this.reconnectAttempts,
      errorMessage: `Koneksi terputus · Mencoba menghubungkan kembali (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
    });
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manuallyClosed && !this.state.roomClosedByHost) {
        this.openSocket(true);
      }
    }, delayMs);
  }

  sendGameAction(action: GameActionPayload): boolean {
    if (
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      !this.state.sessionId ||
      this.state.status !== 'AUTHENTICATED'
    ) {
      return false;
    }
    this.actionSeq += 1;
    const actionId = `act_${Date.now()}_${this.actionSeq}_${Math.random().toString(36).slice(2, 6)}`;
    this.sendRaw({
      type: 'GAME_ACTION',
      sessionId: this.state.sessionId,
      actionId,
      actionSeq: this.actionSeq,
      action,
    });
    return true;
  }

  leaveRoom(): void {
    this.manuallyClosed = true;
    this.clearTimers();
    this.detachVisibilityHandler();
    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      this.state.sessionId
    ) {
      this.sendRaw({
        type: 'LEAVE_ROOM',
        sessionId: this.state.sessionId,
      });
    }
    this.clearAllStoredTokens();
    const socket = this.ws;
    this.ws = null;
    this.socketEpoch += 1;
    this.detachSocket(socket);
    this.setState({
      status: 'DISCONNECTED',
      sessionId: null,
      reconnectToken: null,
      room: null,
      gameState: null,
      isHostDead: false,
      roomClosedByHost: false,
      errorMessage: null,
    });
  }

  destroy(): void {
    this.manuallyClosed = true;
    this.clearTimers();
    this.detachVisibilityHandler();
    const socket = this.ws;
    this.ws = null;
    this.socketEpoch += 1;
    this.detachSocket(socket);
  }

  private sendRaw(msg: ClientToHostMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
