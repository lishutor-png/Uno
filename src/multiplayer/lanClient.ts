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

const HEARTBEAT_INTERVAL_MS = 3500;
const HEARTBEAT_STALE_MS = 10000;
const RECONNECT_BACKOFF_MS = [1000, 2000, 4000, 8000, 8000, 8000];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_BACKOFF_MS.length;

function getReconnectStorageKey(roomIdOrCode: string): string {
  return `mabar_uno_reconnect_${roomIdOrCode.toUpperCase()}`;
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
  if (prevRoom && (delta.roomStatus !== undefined || delta.participantUpdates !== undefined || delta.disconnectedPlayerIds !== undefined)) {
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
  };

  constructor(opts: LanClientOptions) {
    this.opts = opts;
    try {
      const storageKey = getReconnectStorageKey(opts.roomId || opts.roomCode);
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved) {
        this.state.reconnectToken = saved;
      }
    } catch {
      // Ignore storage errors in non-browser contexts
    }
  }

  private setState(partial: Partial<LanClientState>): void {
    this.state = { ...this.state, ...partial };
    this.opts.onStateChange(this.state);
  }

  connect(): void {
    this.manuallyClosed = false;
    this.reconnectAttempts = 0;
    this.clearTimers();
    this.openSocket(false);
  }

  /**
   * Manual retry entry point ("COBA SAMBUNGKAN KEMBALI") when connection dropped.
   */
  reconnectNow(): void {
    if (!this.state.reconnectToken && !this.opts.roomAuthToken) {
      return;
    }
    this.manuallyClosed = false;
    this.reconnectAttempts = 0;
    this.clearTimers();
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
    }
    this.openSocket(true);
  }

  private openSocket(isReconnect: boolean): void {
    this.setState({
      status: isReconnect ? 'RECONNECTING' : 'CONNECTING',
      errorMessage: isReconnect
        ? 'Sedang mencoba menyambungkan kembali...'
        : null,
      isHostDead: false,
    });

    const url = `ws://${this.opts.hostIp.trim()}:${this.opts.port}`;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      this.setState({
        status: isReconnect ? 'DISCONNECTED' : 'ERROR',
        errorMessage: `Gagal membuka koneksi WebSocket ke ${url}: ${
          err instanceof Error ? err.message : 'URL tidak valid'
        }`,
      });
      return;
    }

    this.ws = socket;

    socket.onopen = () => {
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
      try {
        const msg = JSON.parse(String(event.data)) as HostToClientMessage;
        this.handleHostMessage(msg);
      } catch {
        // Ignore malformed JSON frames
      }
    };

    socket.onerror = () => {
      if (this.state.status === 'CONNECTING' && !isReconnect) {
        this.setState({
          status: 'ERROR',
          errorMessage: `Tidak dapat menjangkau server host di ${url}. Pastikan kedua HP berada di Hotspot/Wi-Fi LAN yang sama.`,
        });
      }
    };

    socket.onclose = () => {
      this.clearHeartbeat();
      if (this.ws === socket) {
        this.ws = null;
      }
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
            'Host tidak dapat dijangkau setelah beberapa kali percobaan. Kemungkinan Wi-Fi terputus atau Host menutup aplikasi.',
        });
      } else if (this.state.status !== 'ERROR') {
        this.setState({
          status: 'DISCONNECTED',
          errorMessage: 'Koneksi ke host terputus.',
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
        try {
          const storageKey = getReconnectStorageKey(
            msg.room.roomId || msg.room.roomCode
          );
          window.sessionStorage.setItem(storageKey, msg.reconnectToken);
        } catch {
          // Ignore storage error
        }
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
        });
        this.startHeartbeat();
        break;
      }
      case 'JOIN_REJECTED': {
        this.manuallyClosed = true;
        this.setState({
          status: 'ERROR',
          errorMessage: msg.reason,
        });
        this.ws?.close();
        break;
      }
      case 'PONG': {
        this.lastPongAt = Date.now();
        const nextLatency = Math.max(1, Date.now() - msg.clientTime);
        // Only propagate state update if latency shifted noticeably (> 8ms) to reduce idle re-renders
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
          // Sequence gap detected -> request authoritative full sync
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
        try {
          const storageKey = getReconnectStorageKey(
            this.state.room?.roomId || this.opts.roomId || this.opts.roomCode
          );
          window.sessionStorage.removeItem(storageKey);
        } catch {
          // Ignore
        }
        this.opts.onKickedOrClosed?.(msg.reason);
        this.setState({
          status: 'DISCONNECTED',
          isHostDead: msg.type === 'ROOM_CLOSED',
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
    this.reconnectAttempts += 1;
    const delayMs =
      RECONNECT_BACKOFF_MS[
        Math.min(this.reconnectAttempts - 1, RECONNECT_BACKOFF_MS.length - 1)
      ];
    this.setState({
      status: 'RECONNECTING',
      reconnectAttempt: this.reconnectAttempts,
      errorMessage: `Sedang mencoba menyambungkan kembali (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
    });
    this.reconnectTimer = window.setTimeout(() => {
      if (!this.manuallyClosed) {
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
    try {
      const storageKey = getReconnectStorageKey(
        this.state.room?.roomId || this.opts.roomId || this.opts.roomCode
      );
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    this.ws?.close();
    this.ws = null;
    this.setState({ status: 'DISCONNECTED' });
  }

  destroy(): void {
    this.manuallyClosed = true;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
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
