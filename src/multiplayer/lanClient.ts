import { ClientVisibleGameState } from '../engine/types';
import {
  ClientToHostMessage,
  GameActionPayload,
  HostToClientMessage,
  QrTokenType,
  RoomPublicSnapshot,
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

const HEARTBEAT_INTERVAL_MS = 3000;
const HEARTBEAT_STALE_MS = 10000;
const MAX_RECONNECT_ATTEMPTS = 5;

function getReconnectStorageKey(roomIdOrCode: string): string {
  return `uno_arena_reconnect_${roomIdOrCode.toUpperCase()}`;
}

export class LanWebSocketClient {
  private opts: LanClientOptions;
  private ws: WebSocket | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private lastPongAt = 0;
  private reconnectAttempts = 0;
  private manuallyClosed = false;

  private state: LanClientState = {
    status: 'IDLE',
    errorMessage: null,
    playerId: null,
    sessionId: null,
    reconnectToken: null,
    room: null,
    gameState: null,
    latencyMs: null,
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
    this.clearTimers();
    this.openSocket(false);
  }

  private openSocket(isReconnect: boolean): void {
    this.setState({
      status: isReconnect ? 'RECONNECTING' : 'CONNECTING',
      errorMessage: null,
    });

    const url = `ws://${this.opts.hostIp.trim()}:${this.opts.port}`;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      this.setState({
        status: 'ERROR',
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
      if (this.state.status === 'CONNECTING') {
        this.setState({
          status: 'ERROR',
          errorMessage: `Tidak dapat menjangkau server host di ${url}. Pastikan kedua HP berada di Hotspot/Wi-Fi LAN yang sama.`,
        });
      }
    };

    socket.onclose = () => {
      this.clearHeartbeat();
      if (this.manuallyClosed) {
        this.setState({ status: 'DISCONNECTED' });
        return;
      }

      if (
        this.state.sessionId &&
        this.state.reconnectToken &&
        this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
      ) {
        this.scheduleReconnect();
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
        this.setState({
          latencyMs: Math.max(1, Date.now() - msg.clientTime),
        });
        break;
      }
      case 'ROOM_UPDATE': {
        this.setState({ room: msg.room });
        break;
      }
      case 'STATE_SYNC': {
        this.setState({
          room: msg.room,
          gameState: msg.gameState,
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
        this.setState({
          status: 'DISCONNECTED',
          errorMessage: msg.reason,
        });
        this.opts.onKickedOrClosed?.(msg.reason);
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
    const delayMs = Math.min(4000, 800 * this.reconnectAttempts);
    this.setState({
      status: 'RECONNECTING',
      errorMessage: `Menghubungkan ulang (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
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
      !this.state.sessionId
    ) {
      return false;
    }
    const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sendRaw({
      type: 'GAME_ACTION',
      sessionId: this.state.sessionId,
      actionId,
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
