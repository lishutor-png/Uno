import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import { HostRoomManager } from '../src/multiplayer/hostRoomManager.ts';
import { LanWebSocketClient } from '../src/multiplayer/lanClient.ts';
import { encodeQrPayload, generateQrDataUrl, parseQrPayload } from '../src/multiplayer/qrCodec.ts';
import { getNativeMultiplayerCapabilities } from '../src/multiplayer/nativeBridge.ts';
import {
  formatPeerStatusLabel,
  resolveWifiDirectHostIp,
  translateWifiDirectError,
} from '../src/multiplayer/wifiDirectHelpers.ts';
import { CLASSIC_RULES, getPlayableCards } from '../src/engine/rules.ts';
import { HostServerTransport, HostToClientMessage } from '../src/multiplayer/types.ts';

class InMemoryTransport implements HostServerTransport {
  sentByConnection = new Map<string, HostToClientMessage[]>();
  kickedConnections: Array<{ connectionId: string; reason: string }> = [];

  sendToClient(connectionId: string, payload: string): boolean {
    const list = this.sentByConnection.get(connectionId) ?? [];
    list.push(JSON.parse(payload) as HostToClientMessage);
    this.sentByConnection.set(connectionId, list);
    return true;
  }

  kickClient(connectionId: string, reason: string): void {
    this.kickedConnections.push({ connectionId, reason });
  }

  lastMessage(connectionId: string): HostToClientMessage | undefined {
    const list = this.sentByConnection.get(connectionId);
    return list?.[list.length - 1];
  }
}

test('Autentikasi room menolak kode/token salah dan menerima token valid', () => {
  const transport = new InMemoryTransport();
  const manager = new HostRoomManager(
    {
      roomId: 'rm_test_1',
      roomCode: 'UNO777',
      roomAuthToken: 'sec999',
      maxPlayers: 4,
      hostMode: 'PLAYER',
      hostName: 'HostHP',
      fillEmptyWithBots: false,
      botDifficulty: 'normal',
      connectionMethod: 'WIFI_LAN',
      port: 8765,
      rules: CLASSIC_RULES,
    },
    transport
  );

  // Wrong token
  manager.handleClientMessage(
    'conn_bad',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomCode: 'UNO777',
      roomAuthToken: 'wrong',
      playerName: 'Intruder',
    })
  );
  assert.equal(transport.lastMessage('conn_bad')?.type, 'JOIN_REJECTED');

  // Valid token
  manager.handleClientMessage(
    'conn_p2',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomCode: 'UNO777',
      roomAuthToken: 'sec999',
      playerName: 'Budi',
    })
  );
  const accepted = transport.lastMessage('conn_p2');
  assert.equal(accepted?.type, 'JOIN_ACCEPTED');
  if (accepted?.type === 'JOIN_ACCEPTED') {
    assert.equal(accepted.room.participants.length, 2);
  }
});

test('Isolasi kartu privat: setiap pemain hanya menerima kartunya sendiri, bukan kartu lawan', () => {
  const transport = new InMemoryTransport();
  const manager = new HostRoomManager(
    {
      roomId: 'rm_test_2',
      roomCode: 'PRIV11',
      roomAuthToken: 'tok11',
      maxPlayers: 3,
      hostMode: 'PLAYER',
      hostName: 'HostA',
      fillEmptyWithBots: false,
      botDifficulty: 'normal',
      connectionMethod: 'WIFI_LAN',
      port: 8765,
      rules: CLASSIC_RULES,
    },
    transport
  );

  manager.handleClientMessage(
    'conn_2',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomCode: 'PRIV11',
      roomAuthToken: 'tok11',
      playerName: 'ClientB',
    })
  );
  manager.handleClientMessage(
    'conn_3',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomCode: 'PRIV11',
      roomAuthToken: 'tok11',
      playerName: 'ClientC',
    })
  );

  const startRes = manager.startGame();
  assert.equal(startRes.ok, true);

  const sync2 = transport.lastMessage('conn_2');
  const sync3 = transport.lastMessage('conn_3');
  assert.equal(sync2?.type, 'STATE_SYNC');
  assert.equal(sync3?.type, 'STATE_SYNC');

  if (sync2?.type === 'STATE_SYNC' && sync3?.type === 'STATE_SYNC') {
    assert.equal(sync2.gameState.selfHand.length, 7);
    assert.equal(sync3.gameState.selfHand.length, 7);

    // Hands must be strictly disjoint
    const ids2 = new Set(sync2.gameState.selfHand.map((c) => c.id));
    for (const c of sync3.gameState.selfHand) {
      assert.equal(ids2.has(c.id), false);
    }

    // No `hand` field exists on opponent summaries
    for (const p of sync2.gameState.players) {
      assert.equal('hand' in p, false);
      assert.equal(p.cardCount, 7);
    }
  }
});

test('Validasi giliran, pencegahan aksi ganda, heartbeat timeout, dan reconnect token', () => {
  const transport = new InMemoryTransport();
  const manager = new HostRoomManager(
    {
      roomId: 'rm_test_3',
      roomCode: 'VAL222',
      roomAuthToken: 'tok222',
      maxPlayers: 2,
      hostMode: 'PLAYER',
      hostName: 'HostA',
      fillEmptyWithBots: false,
      botDifficulty: 'normal',
      connectionMethod: 'WIFI_LAN',
      port: 8765,
      rules: CLASSIC_RULES,
    },
    transport
  );

  manager.handleClientMessage(
    'conn_2',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomCode: 'VAL222',
      roomAuthToken: 'tok222',
      playerName: 'ClientB',
    })
  );

  const joined = transport.lastMessage('conn_2');
  assert.equal(joined?.type, 'JOIN_ACCEPTED');
  if (joined?.type !== 'JOIN_ACCEPTED') return;

  manager.startGame();

  // ClientB tries to draw out of turn (HostA goes first)
  manager.handleClientMessage(
    'conn_2',
    JSON.stringify({
      type: 'GAME_ACTION',
      sessionId: joined.sessionId,
      actionId: 'dup_act_1',
      action: { type: 'DRAW_CARD' },
    })
  );
  const rej = transport.lastMessage('conn_2');
  assert.equal(rej?.type, 'ACTION_REJECTED');

  // Heartbeat timeout disconnects ClientB cleanly while preserving hand
  manager.checkHeartbeats(Date.now() + 15000);
  assert.equal(transport.kickedConnections.length, 1);

  // ClientB reconnects on new socket conn_2_new using reconnectToken
  manager.handleClientMessage(
    'conn_2_new',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomCode: 'VAL222',
      roomAuthToken: 'tok222',
      playerName: 'ClientB',
      reconnectToken: joined.reconnectToken,
    })
  );

  const reconnected = transport.lastMessage('conn_2_new');
  assert.equal(reconnected?.type, 'JOIN_ACCEPTED');
  if (reconnected?.type === 'JOIN_ACCEPTED') {
    assert.equal(reconnected.playerId, joined.playerId);
    assert.equal(reconnected.gameState?.selfHand.length, 7);
  }
});

/**
 * Minimal RFC 6455 loopback WebSocket test server to verify real LanWebSocketClient
 * <-> HostRoomManager communication over a real TCP socket without external deps.
 */
function createLoopbackWsServer(
  onConnect: (id: string, send: (txt: string) => void, close: () => void) => void,
  onMsg: (id: string, text: string) => void,
  onClose: (id: string) => void
): Promise<{
  port: number;
  closeAll: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const sockets = new Map<string, net.Socket>();
    let seq = 0;

    const server = http.createServer();
    server.on('upgrade', (req, socket: net.Socket) => {
      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.destroy();
        return;
      }
      const accept = crypto
        .createHash('sha1')
        .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
        .digest('base64');

      socket.write(
        [
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Accept: ${accept}`,
          '',
          '',
        ].join('\r\n')
      );

      seq += 1;
      const connId = `tcp_${seq}`;
      sockets.set(connId, socket);

      const sendFrame = (text: string) => {
        if (socket.destroyed) return;
        const payload = Buffer.from(text, 'utf8');
        let header: Buffer;
        if (payload.length < 126) {
          header = Buffer.from([0x81, payload.length]);
        } else {
          header = Buffer.alloc(4);
          header[0] = 0x81;
          header[1] = 126;
          header.writeUInt16BE(payload.length, 2);
        }
        socket.write(Buffer.concat([header, payload]));
      };

      onConnect(connId, sendFrame, () => socket.end());

      let buf = Buffer.alloc(0);
      socket.on('data', (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 2) {
          const opcode = buf[0] & 0x0f;
          const masked = (buf[1] & 0x80) !== 0;
          let len = buf[1] & 0x7f;
          let offset = 2;
          if (len === 126) {
            if (buf.length < 4) return;
            len = buf.readUInt16BE(2);
            offset = 4;
          }
          const maskOffset = offset;
          if (masked) offset += 4;
          if (buf.length < offset + len) return;

          const payload = Buffer.alloc(len);
          for (let i = 0; i < len; i += 1) {
            payload[i] = masked
              ? buf[offset + i] ^ buf[maskOffset + (i % 4)]
              : buf[offset + i];
          }
          buf = buf.subarray(offset + len);

          if (opcode === 0x8) {
            socket.end();
            return;
          }
          if (opcode === 0x1) {
            onMsg(connId, payload.toString('utf8'));
          }
        }
      });

      socket.on('close', () => {
        sockets.delete(connId);
        onClose(connId);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      resolve({
        port: addr.port,
        closeAll: () =>
          new Promise((res) => {
            for (const s of sockets.values()) s.destroy();
            server.close(() => res());
          }),
      });
    });
  });
}

test('Simulasi real WebSocket TCP LAN antara HostRoomManager dan LanWebSocketClient sampai game selesai', async () => {
  const globalAny = globalThis as unknown as {
    window: Record<string, unknown>;
  };
  globalAny.window = {
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };

  const senders = new Map<string, (txt: string) => void>();
  const closers = new Map<string, () => void>();
  let manager: HostRoomManager;

  const wsServer = await createLoopbackWsServer(
    (id, send, close) => {
      senders.set(id, send);
      closers.set(id, close);
    },
    (id, text) => manager.handleClientMessage(id, text),
    (id) => manager.handleClientDisconnect(id)
  );

  manager = new HostRoomManager(
    {
      roomId: 'rm_test_4',
      roomCode: 'LAN999',
      roomAuthToken: 'key999',
      maxPlayers: 2,
      hostMode: 'PLAYER',
      hostName: 'HostPhone',
      fillEmptyWithBots: false,
      botDifficulty: 'normal',
      connectionMethod: 'WIFI_LAN',
      port: wsServer.port,
      rules: CLASSIC_RULES,
    },
    {
      sendToClient(connectionId, payload) {
        senders.get(connectionId)?.(payload);
        return true;
      },
      kickClient(connectionId) {
        closers.get(connectionId)?.();
      },
    }
  );

  await new Promise<void>((resolve, reject) => {
    let client: LanWebSocketClient;
    let hostTurnScheduled = false;

    const driveHostTurns = () => {
      if (hostTurnScheduled) return;
      hostTurnScheduled = true;
      globalThis.setTimeout(() => {
        hostTurnScheduled = false;
        let authState = manager.getAuthoritativeGameState();
        while (
          authState &&
          !authState.winnerId &&
          authState.players[authState.currentTurnIndex].id === 'player_host'
        ) {
          const active = authState.players[authState.currentTurnIndex];
          const playable = getPlayableCards(active.hand, authState);
          if (active.hand.length === 2 && playable.length > 0) {
            manager.applyHostLocalAction(
              `h_uno_${authState.turnCount}_${Math.random()}`,
              { type: 'CALL_UNO' }
            );
          }
          if (playable.length > 0) {
            const card = playable[0];
            manager.applyHostLocalAction(
              `h_${authState.turnCount}_${Math.random()}`,
              {
                type: 'PLAY_CARD',
                cardId: card.id,
                chosenColor: card.color === 'wild' ? 'red' : undefined,
              }
            );
          } else if (authState.hasDrawnThisTurn) {
            manager.applyHostLocalAction(
              `hp_${authState.turnCount}_${Math.random()}`,
              { type: 'PASS_TURN' }
            );
          } else {
            manager.applyHostLocalAction(
              `hd_${authState.turnCount}_${Math.random()}`,
              { type: 'DRAW_CARD' }
            );
          }
          authState = manager.getAuthoritativeGameState();
        }
        if (authState?.winnerId) {
          client.destroy();
          resolve();
        }
      }, 1);
    };

    client = new LanWebSocketClient({
      hostIp: '127.0.0.1',
      port: wsServer.port,
      roomCode: 'LAN999',
      roomAuthToken: 'key999',
      playerName: 'ClientPhone',
      onStateChange: (s) => {
        if (s.status === 'AUTHENTICATED' && !s.gameState) {
          const started = manager.startGame();
          assert.equal(started.ok, true);
          return;
        }
        if (s.gameState?.winnerId) {
          client.destroy();
          resolve();
          return;
        }
        if (s.status === 'ERROR') {
          client.destroy();
          reject(new Error(s.errorMessage ?? 'Client error'));
          return;
        }
        if (s.gameState) {
          const view = s.gameState;
          if (view.currentTurnPlayerId === s.playerId) {
            const playable = getPlayableCards(view.selfHand, {
              discardPile: [view.topDiscard],
              activeColor: view.activeColor,
              pendingDrawCount: view.pendingDrawCount,
              pendingDrawType: view.pendingDrawType,
              rules: view.rules,
              hasDrawnThisTurn: view.hasDrawnThisTurn,
              drawnCardIdThisTurn: view.drawnCardIdThisTurn,
            });
            if (view.selfHand.length === 2 && playable.length > 0) {
              client.sendGameAction({ type: 'CALL_UNO' });
            }
            if (playable.length > 0) {
              const card = playable[0];
              client.sendGameAction({
                type: 'PLAY_CARD',
                cardId: card.id,
                chosenColor: card.color === 'wild' ? 'blue' : undefined,
              });
            } else if (view.hasDrawnThisTurn) {
              client.sendGameAction({ type: 'PASS_TURN' });
            } else {
              client.sendGameAction({ type: 'DRAW_CARD' });
            }
          } else {
            driveHostTurns();
          }
        }
      },
    });

    client.connect();
  });

  const finalAuth = manager.getAuthoritativeGameState();
  assert.ok(finalAuth?.winnerId);
  assert.ok(finalAuth?.matchResult);

  await wsServer.closeAll();
});

test('QR Codec menghasilkan QR Code asli tanpa data kartu/pribadi dan memvalidasi payload', async () => {
  const payload = {
    protocolVersion: 1 as const,
    roomId: 'rm_qr_1',
    roomCode: 'QR2026',
    hostIp: '192.168.43.1',
    port: 8765,
    qrType: 'SINGLE_GAME' as const,
    roomAuthToken: 'sg_oneuse123',
  };

  const encoded = encodeQrPayload(payload);
  assert.equal(encoded.includes('hand'), false);
  assert.equal(encoded.includes('playerName'), false);

  const parsed = parseQrPayload(encoded);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.payload.roomId, 'rm_qr_1');
    assert.equal(parsed.payload.roomCode, 'QR2026');
    assert.equal(parsed.payload.qrType, 'SINGLE_GAME');
  }

  const qrPngUrl = await generateQrDataUrl(payload);
  assert.ok(qrPngUrl.startsWith('data:image/png;base64,'));
});

test('Single Game QR hanya berlaku 1 kali pakai, sedangkan reconnect token tetap bisa masuk kembali', () => {
  const transport = new InMemoryTransport();
  const manager = new HostRoomManager(
    {
      roomId: 'rm_sg_1',
      roomCode: 'SG1111',
      roomAuthToken: 'pr_persist1',
      maxPlayers: 4,
      hostMode: 'SPECTATOR',
      hostName: 'HostSpectator',
      fillEmptyWithBots: true,
      botDifficulty: 'normal',
      connectionMethod: 'WIFI_LAN',
      port: 8765,
      rules: CLASSIC_RULES,
    },
    transport
  );

  // Spectator host cannot submit PLAY_CARD
  const spectatorBlocked = manager.applyHostLocalAction('sp_1', { type: 'DRAW_CARD' });
  assert.equal(spectatorBlocked.ok, false);

  const singleToken = manager.issueSingleGameToken();
  assert.equal(singleToken.consumed, false);

  // First player uses single-game QR token -> accepted
  manager.handleClientMessage(
    'conn_p1',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomId: 'rm_sg_1',
      roomCode: 'SG1111',
      roomAuthToken: singleToken.token,
      qrType: 'SINGLE_GAME',
      playerName: 'PemainSatu',
    })
  );
  const res1 = transport.lastMessage('conn_p1');
  assert.equal(res1?.type, 'JOIN_ACCEPTED');
  assert.equal(singleToken.consumed, true);

  // Second player tries reusing the same single-game QR token -> rejected
  manager.handleClientMessage(
    'conn_p2',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomId: 'rm_sg_1',
      roomCode: 'SG1111',
      roomAuthToken: singleToken.token,
      qrType: 'SINGLE_GAME',
      playerName: 'PemainDua',
    })
  );
  const res2 = transport.lastMessage('conn_p2');
  assert.equal(res2?.type, 'JOIN_REJECTED');

  // Start game (1 human + 3 bots = 4 players; host is spectator)
  const started = manager.startGame();
  assert.equal(started.ok, true);
  assert.equal(manager.getHostVisibleGameState()?.selfHand.length, 0);
  assert.equal(manager.getHostVisibleGameState()?.players.length, 4);

  // First player reconnects with personal reconnectToken
  if (res1?.type === 'JOIN_ACCEPTED') {
    manager.handleClientDisconnect('conn_p1');
    manager.handleClientMessage(
      'conn_p1_rejoin',
      JSON.stringify({
        type: 'JOIN_REQUEST',
        roomId: 'rm_sg_1',
        roomCode: 'SG1111',
        roomAuthToken: singleToken.token,
        playerName: 'PemainSatu',
        reconnectToken: res1.reconnectToken,
      })
    );
    const rejoined = transport.lastMessage('conn_p1_rejoin');
    assert.equal(rejoined?.type, 'JOIN_ACCEPTED');
    if (rejoined?.type === 'JOIN_ACCEPTED') {
      assert.equal(rejoined.playerId, res1.playerId);
      assert.equal(rejoined.gameState?.selfHand.length, 7);
    }
  }
});

test('Wi-Fi Direct helpers memprioritaskan IP Group Owner, menerjemahkan error, dan tidak memalsukan dukungan browser', () => {
  // Outside Android Capacitor runtime, wifiDirectSupported must be strictly false
  const caps = getNativeMultiplayerCapabilities();
  assert.equal(caps.isAndroidCapacitor, false);
  assert.equal(caps.wifiDirectSupported, false);

  // Resolves WifiP2pInfo.groupOwnerAddress first when group is formed
  const resolved = resolveWifiDirectHostIp(
    {
      groupFormed: true,
      isGroupOwner: true,
      groupOwnerAddress: '192.168.49.1',
      networkName: 'DIRECT-XY-UNO',
      clients: [],
    },
    ['10.0.2.15', '192.168.49.1']
  );
  assert.equal(resolved, '192.168.49.1');

  // Falls back to 192.168.49.* P2P interface if groupOwnerAddress is empty
  assert.equal(
    resolveWifiDirectHostIp(null, ['192.168.1.12', '192.168.49.1']),
    '192.168.49.1'
  );

  // Translates status & error codes clearly
  assert.equal(formatPeerStatusLabel('CONNECTED'), 'Terhubung');
  assert.equal(formatPeerStatusLabel('AVAILABLE'), 'Tersedia');
  assert.ok(
    translateWifiDirectError({ code: 'P2P_UNSUPPORTED' }).includes('tidak mendukung')
  );
  assert.ok(
    translateWifiDirectError({ code: 'BUSY' }).includes('sibuk')
  );
});

test('Deduplikasi actionId & actionSeq mencegah aksi ganda dan double turn', () => {
  const transport = new InMemoryTransport();
  const manager = new HostRoomManager(
    {
      roomId: 'rm_dedup_1',
      roomCode: 'DEDUP1',
      roomAuthToken: 'tok_dedup',
      maxPlayers: 2,
      hostMode: 'PLAYER',
      hostName: 'HostA',
      fillEmptyWithBots: false,
      botDifficulty: 'normal',
      connectionMethod: 'WIFI_LAN',
      port: 8765,
      rules: CLASSIC_RULES,
    },
    transport
  );

  manager.handleClientMessage(
    'conn_2',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomCode: 'DEDUP1',
      roomAuthToken: 'tok_dedup',
      playerName: 'ClientB',
    })
  );
  const joined = transport.lastMessage('conn_2');
  assert.equal(joined?.type, 'JOIN_ACCEPTED');
  if (joined?.type !== 'JOIN_ACCEPTED') return;

  manager.startGame();

  // Host plays or draws once so turn moves to ClientB
  const authBefore = manager.getAuthoritativeGameState()!;
  const hostPlayable = getPlayableCards(authBefore.players[0].hand, authBefore);
  if (hostPlayable.length > 0) {
    manager.applyHostLocalAction('host_mv_1', {
      type: 'PLAY_CARD',
      cardId: hostPlayable[0].id,
      chosenColor: hostPlayable[0].color === 'wild' ? 'red' : undefined,
    });
  } else {
    manager.applyHostLocalAction('host_dr_1', { type: 'DRAW_CARD' });
    const afterHostDraw = manager.getAuthoritativeGameState()!;
    if (
      afterHostDraw.players[afterHostDraw.currentTurnIndex].id === 'player_host' &&
      afterHostDraw.hasDrawnThisTurn
    ) {
      manager.applyHostLocalAction('host_ps_1', { type: 'PASS_TURN' });
    }
  }

  // Ensure ClientB is active (or force turn to ClientB if host played Reverse/Skip in 2p)
  let current = manager.getAuthoritativeGameState()!;
  if (current.players[current.currentTurnIndex].id !== joined.playerId) {
    // Host got another turn due to Skip/Reverse in 2p -> draw & pass
    manager.applyHostLocalAction('host_dr_2', { type: 'DRAW_CARD' });
    current = manager.getAuthoritativeGameState()!;
    if (current.hasDrawnThisTurn) {
      manager.applyHostLocalAction('host_ps_2', { type: 'PASS_TURN' });
    }
  }

  const beforeClientDraw = manager.getAuthoritativeGameState()!;
  const clientPlayerIdx = beforeClientDraw.players.findIndex(
    (p) => p.id === joined.playerId
  );
  if (beforeClientDraw.currentTurnIndex === clientPlayerIdx) {
    const handLenBefore = beforeClientDraw.players[clientPlayerIdx].hand.length;
    const versionBefore = manager.getStateVersion();

    // Send DRAW_CARD with actionId='act_seq_1', actionSeq=1
    manager.handleClientMessage(
      'conn_2',
      JSON.stringify({
        type: 'GAME_ACTION',
        sessionId: joined.sessionId,
        actionId: 'act_seq_1',
        actionSeq: 1,
        action: { type: 'DRAW_CARD' },
      })
    );
    const afterFirstDraw = manager.getAuthoritativeGameState()!;
    assert.equal(afterFirstDraw.players[clientPlayerIdx].hand.length, handLenBefore + 1);
    const versionAfterFirst = manager.getStateVersion();
    assert.ok(versionAfterFirst > versionBefore);

    // Duplicate exact same actionId -> must be ignored cleanly (no second draw, no error, no version bump)
    manager.handleClientMessage(
      'conn_2',
      JSON.stringify({
        type: 'GAME_ACTION',
        sessionId: joined.sessionId,
        actionId: 'act_seq_1',
        actionSeq: 1,
        action: { type: 'DRAW_CARD' },
      })
    );
    // Duplicate older actionSeq with different actionId -> also ignored cleanly
    manager.handleClientMessage(
      'conn_2',
      JSON.stringify({
        type: 'GAME_ACTION',
        sessionId: joined.sessionId,
        actionId: 'act_seq_stale',
        actionSeq: 1,
        action: { type: 'DRAW_CARD' },
      })
    );

    const afterDuplicate = manager.getAuthoritativeGameState()!;
    assert.equal(afterDuplicate.players[clientPlayerIdx].hand.length, handLenBefore + 1);
    assert.equal(manager.getStateVersion(), versionAfterFirst);
    assert.notEqual(transport.lastMessage('conn_2')?.type, 'ACTION_REJECTED');
  }
});

test('Putus koneksi saat giliran pemain menjeda pertandingan, mencegah bot jalan, dan pulih saat reconnect', () => {
  const transport = new InMemoryTransport();
  const manager = new HostRoomManager(
    {
      roomId: 'rm_pause_1',
      roomCode: 'PAUSE1',
      roomAuthToken: 'tok_pause',
      maxPlayers: 3,
      hostMode: 'SPECTATOR',
      hostName: 'HostSpec',
      fillEmptyWithBots: true,
      botDifficulty: 'normal',
      connectionMethod: 'WIFI_LAN',
      port: 8765,
      rules: CLASSIC_RULES,
    },
    transport
  );

  manager.handleClientMessage(
    'conn_p1',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomCode: 'PAUSE1',
      roomAuthToken: 'tok_pause',
      playerName: 'Andi',
    })
  );
  const p1Join = transport.lastMessage('conn_p1');
  assert.equal(p1Join?.type, 'JOIN_ACCEPTED');
  if (p1Join?.type !== 'JOIN_ACCEPTED') return;

  manager.startGame();

  // Andi is seat 0 -> it is Andi's turn right now!
  const beforeDisconnect = manager.getHostVisibleGameState()!;
  assert.equal(beforeDisconnect.currentTurnPlayerId, p1Join.playerId);
  assert.equal(beforeDisconnect.pausedByDisconnect, false);

  // Healthy heartbeat check must return false and send nothing extra
  const msgCountBeforeHealthyCheck = transport.sentByConnection.get('conn_p1')?.length ?? 0;
  assert.equal(manager.checkHeartbeats(Date.now()), false);
  assert.equal(transport.sentByConnection.get('conn_p1')?.length ?? 0, msgCountBeforeHealthyCheck);

  // Andi disconnects while it is Andi's turn -> game pauses & preserves Andi's 7 cards
  manager.handleClientDisconnect('conn_p1');
  const pausedView = manager.getHostVisibleGameState()!;
  assert.equal(pausedView.pausedByDisconnect, true);
  assert.deepEqual(pausedView.pausedPlayerNames, ['Andi']);
  assert.deepEqual(pausedView.disconnectedPlayerIds, [p1Join.playerId]);
  assert.equal(manager.stepBotTurnIfNeeded(), false);

  // Andi reconnects -> full STATE_SYNC via JOIN_ACCEPTED, pause clears
  manager.handleClientMessage(
    'conn_p1_new',
    JSON.stringify({
      type: 'JOIN_REQUEST',
      roomCode: 'PAUSE1',
      roomAuthToken: 'tok_pause',
      playerName: 'Andi',
      reconnectToken: p1Join.reconnectToken,
    })
  );
  const rejoined = transport.lastMessage('conn_p1_new');
  assert.equal(rejoined?.type, 'JOIN_ACCEPTED');
  if (rejoined?.type === 'JOIN_ACCEPTED') {
    assert.equal(rejoined.gameState?.selfHand.length, 7);
    assert.equal(rejoined.gameState?.pausedByDisconnect, false);
    assert.deepEqual(rejoined.gameState?.disconnectedPlayerIds, []);
  }
});

test('Sinkronisasi STATE_DELTA, pemulihan RESYNC_REQUEST saat gap versi, dan penutupan room Host', async () => {
  const globalAny = globalThis as unknown as {
    window: Record<string, unknown>;
  };
  globalAny.window = {
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };

  const senders = new Map<string, (txt: string) => void>();
  const closers = new Map<string, () => void>();
  const receivedTypes: string[] = [];
  let manager: HostRoomManager;

  const wsServer = await createLoopbackWsServer(
    (id, send, close) => {
      senders.set(id, send);
      closers.set(id, close);
    },
    (id, text) => manager.handleClientMessage(id, text),
    (id) => manager.handleClientDisconnect(id)
  );

  manager = new HostRoomManager(
    {
      roomId: 'rm_delta_1',
      roomCode: 'DELTA1',
      roomAuthToken: 'tok_delta',
      maxPlayers: 2,
      hostMode: 'PLAYER',
      hostName: 'HostDelta',
      fillEmptyWithBots: false,
      botDifficulty: 'normal',
      connectionMethod: 'WIFI_LAN',
      port: wsServer.port,
      rules: CLASSIC_RULES,
    },
    {
      sendToClient(connectionId, payload) {
        const parsed = JSON.parse(payload) as HostToClientMessage;
        receivedTypes.push(parsed.type);
        senders.get(connectionId)?.(payload);
        return true;
      },
      kickClient(connectionId) {
        closers.get(connectionId)?.();
      },
    }
  );

  await new Promise<void>((resolve, reject) => {
    let kickedReason: string | null = null;
    let phase: 'WAIT_START' | 'WAIT_DELTA' | 'WAIT_RESYNC' | 'WAIT_CLOSE' = 'WAIT_START';
    let client: LanWebSocketClient;
    let stateSyncCount = 0;

    client = new LanWebSocketClient({
      hostIp: '127.0.0.1',
      port: wsServer.port,
      roomCode: 'DELTA1',
      roomAuthToken: 'tok_delta',
      playerName: 'ClientDelta',
      onKickedOrClosed: (reason) => {
        kickedReason = reason;
      },
      onStateChange: (s) => {
        if (s.status === 'ERROR') {
          client.destroy();
          reject(new Error(s.errorMessage ?? 'Unexpected error'));
          return;
        }
        if (phase === 'WAIT_START' && s.status === 'AUTHENTICATED' && !s.gameState) {
          phase = 'WAIT_DELTA';
          manager.startGame();
          return;
        }
        if (phase === 'WAIT_DELTA' && s.gameState?.stateVersion === 1) {
          stateSyncCount = receivedTypes.filter((t) => t === 'STATE_SYNC').length;
          // Host draws a card -> should send STATE_DELTA (version 1 -> 2)
          manager.applyHostLocalAction('delta_host_draw', { type: 'DRAW_CARD' });
          return;
        }
        if (phase === 'WAIT_DELTA' && s.gameState?.stateVersion === 2) {
          assert.ok(receivedTypes.includes('STATE_DELTA'));
          phase = 'WAIT_RESYNC';
          // Inject a version-gap STATE_DELTA to verify client automatically sends RESYNC_REQUEST -> STATE_SYNC
          const connId = Array.from(senders.keys())[0];
          senders.get(connId)?.(
            JSON.stringify({
              type: 'STATE_DELTA',
              delta: {
                prevVersion: 99,
                stateVersion: 100,
                drawPileCount: 1,
              },
            })
          );
          return;
        }
        if (
          phase === 'WAIT_RESYNC' &&
          s.gameState?.stateVersion === 2 &&
          receivedTypes.filter((t) => t === 'STATE_SYNC').length > stateSyncCount
        ) {
          phase = 'WAIT_CLOSE';
          manager.closeRoom('Host menutup sesi uji');
          return;
        }
        if (phase === 'WAIT_CLOSE' && s.status === 'DISCONNECTED' && s.isHostDead) {
          assert.equal(kickedReason, 'Host menutup sesi uji');
          client.destroy();
          resolve();
        }
      },
    });

    client.connect();
  });

  await wsServer.closeAll();
});


