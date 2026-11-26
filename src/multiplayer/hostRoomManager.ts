import { decideBotMove } from '../engine/botAi';
import { createStandardDeck, shuffleDeck } from '../engine/deck';
import {
  applyCallUno,
  applyCatchUnoPenalty,
  applyDrawCard,
  applyPassAfterDraw,
  applyPlayCard,
  getClientVisibleState,
} from '../engine/gameEngine';
import {
  CardColor,
  ClientVisibleGameState,
  GameState,
  Player,
  UnoCard,
} from '../engine/types';
import { BOT_PROFILES } from '../utilities/cardHelpers';
import {
  ClientToHostMessage,
  HostServerTransport,
  HostToClientMessage,
  MultiplayerRoomConfig,
  PlayerSession,
  RoomParticipantSummary,
  RoomPublicSnapshot,
  SingleGameTokenRecord,
  StateDeltaPayload,
} from './types';

const COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];
const HEARTBEAT_TIMEOUT_MS = 9000;
export const RECONNECT_GRACE_MS = 90000;

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function generateRoomId(): string {
  return `rm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function generateAuthToken(prefix = ''): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix ? `${prefix}_${out}` : out;
}

function cardsEqual(a: readonly UnoCard[], b: readonly UnoCard[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id) return false;
  }
  return true;
}

function arraysEqual(a: readonly string[] = [], b: readonly string[] = []): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function buildStateDelta(
  prev: ClientVisibleGameState,
  next: ClientVisibleGameState,
  prevVersion: number,
  nextVersion: number,
  room: RoomPublicSnapshot,
  prevRoom: RoomPublicSnapshot | null
): StateDeltaPayload | null {
  const delta: StateDeltaPayload = {
    prevVersion,
    stateVersion: nextVersion,
  };
  let hasChanges = false;

  if (!prevRoom || prevRoom.status !== room.status) {
    delta.roomStatus = room.status;
    hasChanges = true;
  }

  const prevParticipantsJson = prevRoom
    ? JSON.stringify(prevRoom.participants)
    : '';
  const nextParticipantsJson = JSON.stringify(room.participants);
  if (prevParticipantsJson !== nextParticipantsJson) {
    delta.participantUpdates = room.participants;
    hasChanges = true;
  }

  if (!cardsEqual(prev.selfHand, next.selfHand)) {
    delta.selfHand = next.selfHand;
    hasChanges = true;
  }
  if (prev.selfCalledUno !== next.selfCalledUno) {
    delta.selfCalledUno = next.selfCalledUno;
    hasChanges = true;
  }
  if (JSON.stringify(prev.players) !== JSON.stringify(next.players)) {
    delta.players = next.players;
    hasChanges = true;
  }
  if (prev.topDiscard.id !== next.topDiscard.id) {
    delta.topDiscard = next.topDiscard;
    hasChanges = true;
  }
  if (prev.discardCount !== next.discardCount) {
    delta.discardCount = next.discardCount;
    hasChanges = true;
  }
  if (prev.drawPileCount !== next.drawPileCount) {
    delta.drawPileCount = next.drawPileCount;
    hasChanges = true;
  }
  if (prev.activeColor !== next.activeColor) {
    delta.activeColor = next.activeColor;
    hasChanges = true;
  }
  if (prev.direction !== next.direction) {
    delta.direction = next.direction;
    hasChanges = true;
  }
  if (prev.currentTurnPlayerId !== next.currentTurnPlayerId) {
    delta.currentTurnPlayerId = next.currentTurnPlayerId;
    hasChanges = true;
  }
  if (prev.pendingDrawCount !== next.pendingDrawCount) {
    delta.pendingDrawCount = next.pendingDrawCount;
    hasChanges = true;
  }
  if (prev.pendingDrawType !== next.pendingDrawType) {
    delta.pendingDrawType = next.pendingDrawType;
    hasChanges = true;
  }
  if (prev.hasDrawnThisTurn !== next.hasDrawnThisTurn) {
    delta.hasDrawnThisTurn = next.hasDrawnThisTurn;
    hasChanges = true;
  }
  if (prev.drawnCardIdThisTurn !== next.drawnCardIdThisTurn) {
    delta.drawnCardIdThisTurn = next.drawnCardIdThisTurn;
    hasChanges = true;
  }
  if (prev.turnCount !== next.turnCount) {
    delta.turnCount = next.turnCount;
    hasChanges = true;
  }
  if (prev.winnerId !== next.winnerId) {
    delta.winnerId = next.winnerId;
    hasChanges = true;
  }
  if (prev.matchResult !== next.matchResult && next.matchResult !== null) {
    delta.matchResult = next.matchResult;
    hasChanges = true;
  }
  if (prev.lastEvent?.id !== next.lastEvent?.id) {
    delta.lastEvent = next.lastEvent;
    hasChanges = true;
  }
  if (Boolean(prev.pausedByDisconnect) !== Boolean(next.pausedByDisconnect)) {
    delta.pausedByDisconnect = Boolean(next.pausedByDisconnect);
    hasChanges = true;
  }
  if (!arraysEqual(prev.pausedPlayerNames, next.pausedPlayerNames)) {
    delta.pausedPlayerNames = next.pausedPlayerNames ?? [];
    hasChanges = true;
  }
  if (!arraysEqual(prev.disconnectedPlayerIds, next.disconnectedPlayerIds)) {
    delta.disconnectedPlayerIds = next.disconnectedPlayerIds ?? [];
    hasChanges = true;
  }

  return hasChanges ? delta : null;
}

/**
 * Authoritative Host Room & Game Controller.
 * Manages Room ID, Persistent Room Auth, Single-Use Game QR Tokens,
 * Host/Spectator modes, player roster (2-8), heartbeat, disconnect pause & reconnect,
 * action deduplication, and delta-optimized private card sync.
 */
export class HostRoomManager {
  readonly config: MultiplayerRoomConfig;
  private readonly transport: HostServerTransport;
  private sessions = new Map<string, PlayerSession>(); // keyed by playerId
  private connectionToPlayerId = new Map<string, string>();
  private singleGameTokens = new Map<string, SingleGameTokenRecord>();
  private status: RoomPublicSnapshot['status'] = 'LOBBY';
  private gameState: GameState | null = null;
  private hostPlayerId: string | null = null;
  private stateVersion = 0;
  private processedActionIds = new Set<string>();
  private lastActionSeqByPlayer = new Map<string, number>();
  private lastSentStateByPlayer = new Map<string, ClientVisibleGameState>();
  private lastSentRoomByPlayer = new Map<string, RoomPublicSnapshot>();
  private lastSentVersionByPlayer = new Map<string, number>();
  private onHostStateChange?: (
    room: RoomPublicSnapshot,
    hostView: ClientVisibleGameState | null
  ) => void;

  constructor(
    config: MultiplayerRoomConfig,
    transport: HostServerTransport,
    onHostStateChange?: (
      room: RoomPublicSnapshot,
      hostView: ClientVisibleGameState | null
    ) => void
  ) {
    this.config = { ...config, rules: { ...config.rules } };
    this.transport = transport;
    this.onHostStateChange = onHostStateChange;

    if (this.config.hostMode === 'PLAYER') {
      const hostId = 'player_host';
      this.hostPlayerId = hostId;
      this.sessions.set(hostId, {
        playerId: hostId,
        sessionId: randomId('sess'),
        reconnectToken: randomId('rec'),
        connectionId: null,
        displayName: this.config.hostName.trim() || 'Host',
        isHost: true,
        isSpectator: false,
        connected: true,
        disconnectedAt: null,
        lastHeartbeatAt: Date.now(),
      });
    } else {
      this.hostPlayerId = 'spectator_host';
    }
  }

  /**
   * Issues a one-time Single Game QR token valid for exactly one join.
   */
  issueSingleGameToken(): SingleGameTokenRecord {
    const token = generateAuthToken('sg');
    const record: SingleGameTokenRecord = {
      token,
      createdAt: Date.now(),
      consumed: false,
      usedByPlayerId: null,
      usedByPlayerName: null,
    };
    this.singleGameTokens.set(token, record);
    return record;
  }

  getSingleGameTokens(): SingleGameTokenRecord[] {
    return Array.from(this.singleGameTokens.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  getStateVersion(): number {
    return this.stateVersion;
  }

  private getDisconnectMeta(): {
    pausedByDisconnect: boolean;
    pausedPlayerNames: string[];
    disconnectedPlayerIds: string[];
  } {
    if (!this.gameState) {
      const disconnectedPlayerIds = Array.from(this.sessions.values())
        .filter((s) => !s.isHost && !s.isSpectator && !s.connected)
        .map((s) => s.playerId);
      return {
        pausedByDisconnect: false,
        pausedPlayerNames: [],
        disconnectedPlayerIds,
      };
    }

    const disconnectedHumans = this.gameState.players.filter((p) => {
      if (p.isBot) return false;
      const sess = this.sessions.get(p.id);
      return sess ? !sess.connected : false;
    });

    const activePlayer =
      this.gameState.players[this.gameState.currentTurnIndex];
    const activeSess =
      activePlayer && !activePlayer.isBot
        ? this.sessions.get(activePlayer.id)
        : undefined;
    const pausedByDisconnect =
      this.status === 'IN_GAME' &&
      !this.gameState.winnerId &&
      Boolean(activePlayer && !activePlayer.isBot && activeSess && !activeSess.connected);

    return {
      pausedByDisconnect,
      pausedPlayerNames: pausedByDisconnect && activePlayer
        ? [activePlayer.name]
        : disconnectedHumans.map((p) => p.name),
      disconnectedPlayerIds: disconnectedHumans.map((p) => p.id),
    };
  }

  getSnapshot(): RoomPublicSnapshot {
    const participants: RoomParticipantSummary[] = [];
    const disconnectedPlayerIds: string[] = [];

    if (this.gameState) {
      for (const p of this.gameState.players) {
        const sess = this.sessions.get(p.id);
        const connected = p.isBot ? true : Boolean(sess?.connected);
        if (!p.isBot && !connected) {
          disconnectedPlayerIds.push(p.id);
        }
        participants.push({
          playerId: p.id,
          displayName: p.name,
          isHost: Boolean(sess?.isHost),
          isBot: p.isBot,
          botDifficulty: p.botDifficulty,
          connected,
        });
      }
    } else {
      for (const sess of this.sessions.values()) {
        if (sess.isSpectator) continue;
        if (!sess.connected) {
          disconnectedPlayerIds.push(sess.playerId);
        }
        participants.push({
          playerId: sess.playerId,
          displayName: sess.displayName,
          isHost: sess.isHost,
          isBot: false,
          connected: sess.connected,
        });
      }
    }

    return {
      roomId: this.config.roomId,
      roomCode: this.config.roomCode,
      maxPlayers: this.config.maxPlayers,
      hostMode: this.config.hostMode,
      fillEmptyWithBots: this.config.fillEmptyWithBots,
      botDifficulty: this.config.botDifficulty,
      rules: this.config.rules,
      status: this.status,
      participants,
      disconnectedPlayerIds,
    };
  }

  private buildVisibleStateForPlayer(playerId: string): ClientVisibleGameState | null {
    if (!this.gameState) return null;
    const meta = this.getDisconnectMeta();
    const base = getClientVisibleState(this.gameState, playerId);
    if (this.config.hostMode === 'SPECTATOR' && playerId === this.hostPlayerId) {
      return {
        ...base,
        selfHand: [],
        selfCalledUno: false,
        stateVersion: this.stateVersion,
        ...meta,
      };
    }
    return {
      ...base,
      stateVersion: this.stateVersion,
      ...meta,
    };
  }

  getHostVisibleGameState(): ClientVisibleGameState | null {
    if (!this.gameState || !this.hostPlayerId) return null;
    return this.buildVisibleStateForPlayer(this.hostPlayerId);
  }

  getAuthoritativeGameState(): GameState | null {
    return this.gameState;
  }

  private emitHostUpdate(): void {
    this.onHostStateChange?.(this.getSnapshot(), this.getHostVisibleGameState());
  }

  private sendMessage(connectionId: string, msg: HostToClientMessage): void {
    void this.transport.sendToClient(connectionId, JSON.stringify(msg));
  }

  private syncAllClients(excludePlayerId?: string, forceFullSync = false): void {
    const snapshot = this.getSnapshot();
    for (const sess of this.sessions.values()) {
      if (sess.isHost || !sess.connected || !sess.connectionId) continue;
      if (sess.playerId === excludePlayerId) continue;

      if (this.gameState) {
        const nextView = this.buildVisibleStateForPlayer(sess.playerId);
        if (!nextView) continue;

        const prevView = this.lastSentStateByPlayer.get(sess.playerId);
        const prevRoom = this.lastSentRoomByPlayer.get(sess.playerId) ?? null;
        const prevVer = this.lastSentVersionByPlayer.get(sess.playerId);

        if (forceFullSync || !prevView || prevVer === undefined) {
          this.sendMessage(sess.connectionId, {
            type: 'STATE_SYNC',
            room: snapshot,
            gameState: nextView,
          });
        } else {
          const delta = buildStateDelta(
            prevView,
            nextView,
            prevVer,
            this.stateVersion,
            snapshot,
            prevRoom
          );
          if (delta) {
            this.sendMessage(sess.connectionId, {
              type: 'STATE_DELTA',
              delta,
            });
          }
        }

        this.lastSentStateByPlayer.set(sess.playerId, nextView);
        this.lastSentRoomByPlayer.set(sess.playerId, snapshot);
        this.lastSentVersionByPlayer.set(sess.playerId, this.stateVersion);
      } else {
        this.sendMessage(sess.connectionId, {
          type: 'ROOM_UPDATE',
          room: snapshot,
        });
        this.lastSentRoomByPlayer.set(sess.playerId, snapshot);
      }
    }
    this.emitHostUpdate();
  }

  handleClientMessage(connectionId: string, rawPayload: string): void {
    let msg: ClientToHostMessage;
    try {
      msg = JSON.parse(rawPayload) as ClientToHostMessage;
    } catch {
      return;
    }

    if (msg.type === 'JOIN_REQUEST') {
      this.handleJoinRequest(connectionId, msg);
      return;
    }

    const playerId = this.connectionToPlayerId.get(connectionId);
    if (!playerId) {
      this.sendMessage(connectionId, {
        type: 'JOIN_REJECTED',
        reason: 'Sesi belum terautentikasi.',
      });
      return;
    }

    const session = this.sessions.get(playerId);
    if (!session || session.sessionId !== msg.sessionId) {
      this.sendMessage(connectionId, {
        type: 'JOIN_REJECTED',
        reason: 'Session ID tidak valid.',
      });
      return;
    }

    session.lastHeartbeatAt = Date.now();

    if (msg.type === 'PING') {
      this.sendMessage(connectionId, {
        type: 'PONG',
        clientTime: msg.clientTime,
        serverTime: Date.now(),
      });
      return;
    }

    if (msg.type === 'RESYNC_REQUEST') {
      if (this.gameState) {
        const snapshot = this.getSnapshot();
        const visible = this.buildVisibleStateForPlayer(session.playerId);
        if (visible) {
          this.sendMessage(connectionId, {
            type: 'STATE_SYNC',
            room: snapshot,
            gameState: visible,
          });
          this.lastSentStateByPlayer.set(session.playerId, visible);
          this.lastSentRoomByPlayer.set(session.playerId, snapshot);
          this.lastSentVersionByPlayer.set(session.playerId, this.stateVersion);
        }
      }
      return;
    }

    if (msg.type === 'LEAVE_ROOM') {
      this.handleLeaveRoom(connectionId, session);
      return;
    }

    if (msg.type === 'GAME_ACTION') {
      this.handleRemoteGameAction(
        connectionId,
        session,
        msg.actionId,
        msg.action,
        msg.actionSeq
      );
    }
  }

  private handleJoinRequest(
    connectionId: string,
    msg: Extract<ClientToHostMessage, { type: 'JOIN_REQUEST' }>
  ): void {
    if (this.status === 'CLOSED') {
      this.sendMessage(connectionId, {
        type: 'JOIN_REJECTED',
        reason: 'Room sudah ditutup oleh host.',
      });
      return;
    }

    if (msg.roomId && msg.roomId !== this.config.roomId) {
      this.sendMessage(connectionId, {
        type: 'JOIN_REJECTED',
        reason: 'Room ID tidak cocok dengan room aktif.',
      });
      return;
    }

    if (msg.roomCode.trim().toUpperCase() !== this.config.roomCode.toUpperCase()) {
      this.sendMessage(connectionId, {
        type: 'JOIN_REJECTED',
        reason: 'Kode room tidak ditemukan.',
      });
      return;
    }

    // Check Reconnect Token first so an existing player can rejoin seamlessly without losing seat/cards
    if (msg.reconnectToken) {
      const existing = Array.from(this.sessions.values()).find(
        (s) => s.reconnectToken === msg.reconnectToken && !s.isHost
      );
      if (existing) {
        const knowsPersistent = msg.roomAuthToken === this.config.roomAuthToken;
        const usedValidSingleToken = this.singleGameTokens.has(msg.roomAuthToken);
        if (!knowsPersistent && !usedValidSingleToken) {
          this.sendMessage(connectionId, {
            type: 'JOIN_REJECTED',
            reason: 'Kredensial room tidak valid untuk reconnect.',
          });
          return;
        }

        if (existing.connectionId && existing.connectionId !== connectionId) {
          this.connectionToPlayerId.delete(existing.connectionId);
        }
        existing.connectionId = connectionId;
        existing.connected = true;
        existing.disconnectedAt = null;
        existing.lastHeartbeatAt = Date.now();
        this.connectionToPlayerId.set(connectionId, existing.playerId);

        if (this.gameState) {
          this.stateVersion += 1;
        }

        const snapshot = this.getSnapshot();
        const visible = this.buildVisibleStateForPlayer(existing.playerId);

        this.sendMessage(connectionId, {
          type: 'JOIN_ACCEPTED',
          playerId: existing.playerId,
          sessionId: existing.sessionId,
          reconnectToken: existing.reconnectToken,
          room: snapshot,
          gameState: visible,
        });

        if (visible) {
          this.lastSentStateByPlayer.set(existing.playerId, visible);
          this.lastSentRoomByPlayer.set(existing.playerId, snapshot);
          this.lastSentVersionByPlayer.set(existing.playerId, this.stateVersion);
        }

        this.syncAllClients(existing.playerId);
        return;
      }
    }

    // Validate either Persistent Room Token or Single-Use Game QR Token
    const isPersistentToken = msg.roomAuthToken === this.config.roomAuthToken;
    const singleTokenRecord = this.singleGameTokens.get(msg.roomAuthToken);

    if (!isPersistentToken && !singleTokenRecord) {
      this.sendMessage(connectionId, {
        type: 'JOIN_REJECTED',
        reason: 'Token autentikasi room salah.',
      });
      return;
    }

    if (singleTokenRecord && singleTokenRecord.consumed) {
      this.sendMessage(connectionId, {
        type: 'JOIN_REJECTED',
        reason: 'Token QR Single Game sudah pernah digunakan (sekali pakai).',
      });
      return;
    }

    if (this.status !== 'LOBBY') {
      this.sendMessage(connectionId, {
        type: 'JOIN_REJECTED',
        reason:
          'Pertandingan sedang berlangsung. Gunakan reconnect token untuk masuk kembali.',
      });
      return;
    }

    const activePlayerCount = Array.from(this.sessions.values()).filter(
      (s) => !s.isSpectator
    ).length;

    if (activePlayerCount >= this.config.maxPlayers) {
      this.sendMessage(connectionId, {
        type: 'JOIN_REJECTED',
        reason: 'Room sudah penuh.',
      });
      return;
    }

    const cleanName =
      msg.playerName.trim().slice(0, 16) || `Pemain ${activePlayerCount + 1}`;
    const playerId = randomId('plr');
    const session: PlayerSession = {
      playerId,
      sessionId: randomId('sess'),
      reconnectToken: randomId('rec'),
      connectionId,
      displayName: cleanName,
      isHost: false,
      isSpectator: false,
      connected: true,
      disconnectedAt: null,
      lastHeartbeatAt: Date.now(),
    };

    if (singleTokenRecord) {
      singleTokenRecord.consumed = true;
      singleTokenRecord.usedByPlayerId = playerId;
      singleTokenRecord.usedByPlayerName = cleanName;
    }

    this.sessions.set(playerId, session);
    this.connectionToPlayerId.set(connectionId, playerId);

    this.sendMessage(connectionId, {
      type: 'JOIN_ACCEPTED',
      playerId: session.playerId,
      sessionId: session.sessionId,
      reconnectToken: session.reconnectToken,
      room: this.getSnapshot(),
      gameState: null,
    });
    this.syncAllClients(session.playerId);
  }

  private handleLeaveRoom(connectionId: string, session: PlayerSession): void {
    this.connectionToPlayerId.delete(connectionId);
    if (this.status === 'LOBBY') {
      this.sessions.delete(session.playerId);
    } else {
      session.connected = false;
      session.disconnectedAt = Date.now();
      session.connectionId = null;
      this.stateVersion += 1;
    }
    this.syncAllClients();
  }

  handleClientDisconnect(connectionId: string): void {
    const playerId = this.connectionToPlayerId.get(connectionId);
    if (!playerId) return;
    this.connectionToPlayerId.delete(connectionId);

    const session = this.sessions.get(playerId);
    if (!session) return;

    if (this.status === 'LOBBY') {
      this.sessions.delete(playerId);
    } else {
      // Preserve player seat & hand during active match so they can reconnect safely
      session.connected = false;
      session.disconnectedAt = Date.now();
      session.connectionId = null;
      this.stateVersion += 1;
    }
    this.syncAllClients();
  }

  /**
   * Checks player heartbeats. Returns true only if connection status changed
   * so the Host UI does not emit redundant renders or Wi-Fi frames.
   */
  checkHeartbeats(now = Date.now()): boolean {
    let changed = false;
    for (const sess of this.sessions.values()) {
      if (sess.isHost || !sess.connected) continue;
      if (now - sess.lastHeartbeatAt > HEARTBEAT_TIMEOUT_MS) {
        sess.connected = false;
        sess.disconnectedAt = now;
        if (sess.connectionId) {
          this.connectionToPlayerId.delete(sess.connectionId);
          void this.transport.kickClient(
            sess.connectionId,
            'Timeout heartbeat'
          );
          sess.connectionId = null;
        }
        changed = true;
      }
    }
    if (changed) {
      if (this.gameState) {
        this.stateVersion += 1;
      }
      this.syncAllClients();
    }
    return changed;
  }

  kickPlayer(playerId: string, reason = 'Dikeluarkan oleh host'): void {
    const sess = this.sessions.get(playerId);
    if (!sess || sess.isHost) return;

    if (sess.connectionId) {
      this.sendMessage(sess.connectionId, { type: 'KICKED', reason });
      this.connectionToPlayerId.delete(sess.connectionId);
      void this.transport.kickClient(sess.connectionId, reason);
    }

    if (this.status === 'LOBBY') {
      this.sessions.delete(playerId);
    } else {
      sess.connected = false;
      sess.disconnectedAt = Date.now();
      sess.connectionId = null;
      this.stateVersion += 1;
    }
    this.syncAllClients();
  }

  startGame(): { ok: boolean; error?: string } {
    if (this.status !== 'LOBBY') {
      return { ok: false, error: 'Permainan sudah dimulai.' };
    }

    const humanSessions = Array.from(this.sessions.values()).filter(
      (s) => !s.isSpectator
    );

    const players: Player[] = humanSessions.map((sess, idx) => ({
      id: sess.playerId,
      name: sess.displayName,
      isBot: false,
      avatarColor:
        idx === 0 && sess.isHost
          ? '#10b981'
          : BOT_PROFILES[(idx + 2) % BOT_PROFILES.length].color,
      hand: [],
      calledUno: false,
      vulnerableToUnoPenalty: false,
    }));

    if (this.config.fillEmptyWithBots) {
      let botSeq = 1;
      while (players.length < this.config.maxPlayers) {
        const profile = BOT_PROFILES[(botSeq - 1) % BOT_PROFILES.length];
        players.push({
          id: `bot_lan_${botSeq}`,
          name: profile.name,
          isBot: true,
          botDifficulty: this.config.botDifficulty,
          avatarColor: profile.color,
          hand: [],
          calledUno: false,
          vulnerableToUnoPenalty: false,
        });
        botSeq += 1;
      }
    }

    if (players.length < 2) {
      return {
        ok: false,
        error: 'Minimal 2 pemain dibutuhkan untuk memulai permainan.',
      };
    }

    let deck = shuffleDeck(createStandardDeck());
    for (let r = 0; r < 7; r += 1) {
      for (const p of players) {
        const card = deck.pop();
        if (card) p.hand.push(card);
      }
    }

    const isActionOrWild = (c: UnoCard) =>
      c.color === 'wild' ||
      c.value === 'skip' ||
      c.value === 'reverse' ||
      c.value === 'draw2';

    let firstCard = deck.pop()!;
    while (isActionOrWild(firstCard)) {
      deck.unshift(firstCard);
      deck = shuffleDeck(deck);
      firstCard = deck.pop()!;
    }

    const activeColor: CardColor =
      firstCard.color === 'wild'
        ? COLORS[Math.floor(Math.random() * COLORS.length)]
        : firstCard.color;

    this.stateVersion = 1;
    this.processedActionIds.clear();
    this.lastActionSeqByPlayer.clear();
    this.lastSentStateByPlayer.clear();
    this.lastSentRoomByPlayer.clear();
    this.lastSentVersionByPlayer.clear();

    this.gameState = {
      matchId: `lan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      rules: { ...this.config.rules },
      players,
      drawPile: deck,
      discardPile: [firstCard],
      activeColor,
      direction: 1,
      currentTurnIndex: 0,
      pendingDrawCount: 0,
      pendingDrawType: null,
      hasDrawnThisTurn: false,
      drawnCardIdThisTurn: null,
      turnCount: 1,
      startedAt: Date.now(),
      winnerId: null,
      matchResult: null,
      lastEvent: {
        id: randomId('evt'),
        timestamp: Date.now(),
        actorId: 'host',
        actorName: 'Host',
        type: 'GAME_START',
        message: `Match LAN dimulai (${players.length} pemain). Giliran ${players[0].name}.`,
      },
      processedActionIds: [],
    };

    this.status = 'IN_GAME';
    this.syncAllClients(undefined, true);
    return { ok: true };
  }

  private handleRemoteGameAction(
    connectionId: string,
    session: PlayerSession,
    actionId: string,
    action: Extract<ClientToHostMessage, { type: 'GAME_ACTION' }>['action'],
    actionSeq?: number
  ): void {
    if (session.isSpectator) {
      this.sendMessage(connectionId, {
        type: 'ACTION_REJECTED',
        actionId,
        reason: 'Spectator tidak dapat melakukan aksi permainan.',
      });
      return;
    }

    const result = this.applyAuthoritativeAction(
      session.playerId,
      actionId,
      action,
      actionSeq
    );
    if (result.error) {
      this.sendMessage(connectionId, {
        type: 'ACTION_REJECTED',
        actionId,
        reason: result.error,
      });
    }
  }

  applyHostLocalAction(
    actionId: string,
    action: Extract<ClientToHostMessage, { type: 'GAME_ACTION' }>['action']
  ): { ok: boolean; error?: string } {
    if (this.config.hostMode !== 'PLAYER' || !this.hostPlayerId) {
      return { ok: false, error: 'Host berada dalam mode Spectator.' };
    }
    return this.applyAuthoritativeAction(this.hostPlayerId, actionId, action);
  }

  private applyAuthoritativeAction(
    playerId: string,
    actionId: string,
    action: Extract<ClientToHostMessage, { type: 'GAME_ACTION' }>['action'],
    actionSeq?: number
  ): { ok: boolean; error?: string; deduplicated?: boolean } {
    if (!this.gameState || this.status !== 'IN_GAME') {
      return { ok: false, error: 'Permainan belum aktif.' };
    }

    // Strict idempotent deduplication by actionId & per-player sequence number
    if (this.processedActionIds.has(actionId)) {
      return { ok: true, deduplicated: true };
    }
    if (typeof actionSeq === 'number') {
      const lastSeq = this.lastActionSeqByPlayer.get(playerId) ?? 0;
      if (actionSeq <= lastSeq) {
        return { ok: true, deduplicated: true };
      }
    }

    const disconnectMeta = this.getDisconnectMeta();
    if (disconnectMeta.pausedByDisconnect) {
      return {
        ok: false,
        error: `Permainan dijeda sementara menunggu ${disconnectMeta.pausedPlayerNames.join(', ')} tersambung kembali.`,
      };
    }

    let outcome: { state: GameState; error?: string };

    switch (action.type) {
      case 'PLAY_CARD':
        outcome = applyPlayCard(
          this.gameState,
          playerId,
          action.cardId,
          action.chosenColor,
          actionId
        );
        break;
      case 'DRAW_CARD':
        outcome = applyDrawCard(this.gameState, playerId, actionId);
        break;
      case 'PASS_TURN':
        outcome = applyPassAfterDraw(this.gameState, playerId, actionId);
        break;
      case 'CALL_UNO':
        outcome = applyCallUno(this.gameState, playerId, actionId);
        break;
      case 'CATCH_UNO':
        outcome = applyCatchUnoPenalty(
          this.gameState,
          playerId,
          action.targetPlayerId,
          actionId
        );
        break;
    }

    if (outcome.error) {
      return { ok: false, error: outcome.error };
    }

    this.processedActionIds.add(actionId);
    if (typeof actionSeq === 'number') {
      this.lastActionSeqByPlayer.set(playerId, actionSeq);
    }

    this.stateVersion += 1;
    this.gameState = outcome.state;
    if (this.gameState.winnerId) {
      this.status = 'FINISHED';
    }
    this.syncAllClients();
    return { ok: true };
  }

  stepBotTurnIfNeeded(): boolean {
    if (!this.gameState || this.status !== 'IN_GAME' || this.gameState.winnerId) {
      return false;
    }
    if (this.getDisconnectMeta().pausedByDisconnect) {
      return false;
    }
    const actor = this.gameState.players[this.gameState.currentTurnIndex];
    if (!actor || !actor.isBot) {
      return false;
    }

    const decision = decideBotMove(this.gameState, actor);
    let working = this.gameState;

    if (decision.type === 'PLAY') {
      if (actor.hand.length === 2) {
        const chance =
          actor.botDifficulty === 'easy'
            ? 0.55
            : actor.botDifficulty === 'normal'
              ? 0.8
              : 0.95;
        if (Math.random() < chance) {
          working = applyCallUno(working, actor.id, randomId('bot_uno')).state;
        }
      }
      working = applyPlayCard(
        working,
        actor.id,
        decision.cardId,
        decision.chosenColor,
        randomId('bot_act')
      ).state;
    } else if (decision.type === 'DRAW') {
      working = applyDrawCard(working, actor.id, randomId('bot_act')).state;
    } else {
      working = applyPassAfterDraw(working, actor.id, randomId('bot_act')).state;
    }

    this.stateVersion += 1;
    this.gameState = working;
    if (this.gameState.winnerId) {
      this.status = 'FINISHED';
    }
    this.syncAllClients();
    return true;
  }

  closeRoom(reason = 'Room diakhiri oleh host.'): void {
    this.status = 'CLOSED';
    for (const sess of this.sessions.values()) {
      if (sess.isHost || !sess.connectionId) continue;
      this.sendMessage(sess.connectionId, { type: 'ROOM_CLOSED', reason });
      void this.transport.kickClient(sess.connectionId, reason);
    }
    this.connectionToPlayerId.clear();
    this.emitHostUpdate();
  }
}
