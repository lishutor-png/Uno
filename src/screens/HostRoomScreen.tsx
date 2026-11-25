import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play, RefreshCw, Server, Trash2, UserX } from 'lucide-react';
import { RealQrCodeDisplay } from '../components/RealQrCodeDisplay';
import { CLASSIC_RULES, DEFAULT_HOUSE_RULES } from '../engine/rules';
import {
  BotDifficulty,
  ClientVisibleGameState,
  RoomRuleConfig,
} from '../engine/types';
import {
  HostRoomManager,
  generateAuthToken,
  generateRoomCode,
  generateRoomId,
} from '../multiplayer/hostRoomManager';
import {
  createCapacitorServerTransport,
  getNativeMultiplayerCapabilities,
  getUnoLocalServerPlugin,
} from '../multiplayer/nativeBridge';
import {
  ConnectionMethod,
  QRConnectionPayload,
  QrTokenType,
  RoomPublicSnapshot,
  SingleGameTokenRecord,
  WifiDirectGroupInfo,
} from '../multiplayer/types';
import { resolveWifiDirectHostIp } from '../multiplayer/wifiDirectHelpers';

interface HostRoomScreenProps {
  playerName: string;
  initialTotalPlayers: number;
  initialDifficulty: BotDifficulty;
  initialRules: RoomRuleConfig;
  connectionMethod?: ConnectionMethod;
  wifiDirectInfo?: WifiDirectGroupInfo | null;
  onBack: () => void;
  onGameStarted: (
    manager: HostRoomManager,
    initialRoom: RoomPublicSnapshot,
    initialView: ClientVisibleGameState
  ) => void;
}

export const HostRoomScreen: React.FC<HostRoomScreenProps> = ({
  playerName,
  initialTotalPlayers,
  initialDifficulty,
  initialRules,
  connectionMethod = 'WIFI_LAN',
  wifiDirectInfo = null,
  onBack,
  onGameStarted,
}) => {
  const caps = getNativeMultiplayerCapabilities();
  const [maxPlayers, setMaxPlayers] = useState(initialTotalPlayers);
  const [hostMode, setHostMode] = useState<'PLAYER' | 'SPECTATOR'>('PLAYER');
  const [fillBots, setFillBots] = useState(true);
  const [botDifficulty, setBotDifficulty] =
    useState<BotDifficulty>(initialDifficulty);
  const [rules, setRules] = useState<RoomRuleConfig>(initialRules);
  const [port, setPort] = useState(8765);

  const [serverActive, setServerActive] = useState(false);
  const [hostIps, setHostIps] = useState<string[]>([]);
  const [roomId, setRoomId] = useState(() => generateRoomId());
  const [roomCode, setRoomCode] = useState(() => generateRoomCode());
  const [persistentToken, setPersistentToken] = useState(() =>
    generateAuthToken('pr')
  );
  const [activeQrTab, setActiveQrTab] = useState<QrTokenType>('PERSISTENT_ROOM');
  const [singleTokens, setSingleTokens] = useState<SingleGameTokenRecord[]>([]);
  const [selectedSingleToken, setSelectedSingleToken] =
    useState<SingleGameTokenRecord | null>(null);

  const [roomSnapshot, setRoomSnapshot] = useState<RoomPublicSnapshot | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const managerRef = useRef<HostRoomManager | null>(null);
  const handedOffRef = useRef(false);

  useEffect(() => {
    return () => {
      if (!handedOffRef.current && managerRef.current) {
        managerRef.current.closeRoom('Host membatalkan room.');
        const plugin = getUnoLocalServerPlugin();
        void plugin?.stopServer();
      }
    };
  }, []);

  const handleStartServer = async () => {
    setErrorMsg(null);
    const plugin = getUnoLocalServerPlugin();
    if (!plugin) {
      setErrorMsg(
        'Server WebSocket lokal membutuhkan APK Android Studio dengan plugin Kotlin UnoLocalServer. Tidak dapat dijalankan di browser web.'
      );
      return;
    }

    try {
      const nextRoomId = generateRoomId();
      const nextCode = generateRoomCode();
      const nextPersistentToken = generateAuthToken('pr');
      setRoomId(nextRoomId);
      setRoomCode(nextCode);
      setPersistentToken(nextPersistentToken);

      const startRes = await plugin.startServer({ port });
      if (!startRes.started) {
        setErrorMsg('Gagal memulai server WebSocket lokal pada perangkat.');
        return;
      }

      const transport = createCapacitorServerTransport(plugin);
      const manager = new HostRoomManager(
        {
          roomId: nextRoomId,
          roomCode: nextCode,
          roomAuthToken: nextPersistentToken,
          maxPlayers,
          hostMode,
          hostName: playerName,
          fillEmptyWithBots: fillBots,
          botDifficulty,
          connectionMethod,
          port: startRes.port,
          rules,
        },
        transport,
        (snapshot, hostView) => {
          setRoomSnapshot(snapshot);
          setSingleTokens(manager.getSingleGameTokens());
          if (snapshot.status === 'IN_GAME' && hostView && !handedOffRef.current) {
            handedOffRef.current = true;
            onGameStarted(manager, snapshot, hostView);
          }
        }
      );

      const initialSingle = manager.issueSingleGameToken();
      managerRef.current = manager;
      const resolvedPrimary =
        connectionMethod === 'WIFI_DIRECT'
          ? resolveWifiDirectHostIp(wifiDirectInfo, startRes.ipAddresses)
          : startRes.ipAddresses[0] ?? '';
      const mergedIps = resolvedPrimary
        ? [
            resolvedPrimary,
            ...startRes.ipAddresses.filter((ip) => ip !== resolvedPrimary),
          ]
        : startRes.ipAddresses;
      setHostIps(mergedIps);
      setRoomSnapshot(manager.getSnapshot());
      setSingleTokens(manager.getSingleGameTokens());
      setSelectedSingleToken(initialSingle);
      setServerActive(true);

      await plugin.addListener('clientMessage', (ev) => {
        manager.handleClientMessage(ev.connectionId, ev.payload);
      });
      await plugin.addListener('clientDisconnected', (ev) => {
        manager.handleClientDisconnect(ev.connectionId);
      });
      await plugin.addListener('serverError', (ev) => {
        setErrorMsg(ev.message);
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal menjalankan server WebSocket lokal.'
      );
    }
  };

  const handleIssueNewSingleToken = () => {
    if (!managerRef.current) return;
    const rec = managerRef.current.issueSingleGameToken();
    setSingleTokens(managerRef.current.getSingleGameTokens());
    setSelectedSingleToken(rec);
  };

  const handleStopServer = async () => {
    managerRef.current?.closeRoom('Room dihentikan oleh host.');
    managerRef.current = null;
    const plugin = getUnoLocalServerPlugin();
    await plugin?.stopServer();
    setServerActive(false);
    setRoomSnapshot(null);
    setSingleTokens([]);
    setSelectedSingleToken(null);
  };

  const handleStartMatch = () => {
    if (!managerRef.current) return;
    const res = managerRef.current.startGame();
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  const primaryIp = hostIps[0] ?? '';

  const activeQrPayload = useMemo<QRConnectionPayload | null>(() => {
    if (!serverActive || !primaryIp) return null;
    if (activeQrTab === 'PERSISTENT_ROOM') {
      return {
        protocolVersion: 1,
        roomId,
        roomCode,
        hostIp: primaryIp,
        port,
        qrType: 'PERSISTENT_ROOM',
        roomAuthToken: persistentToken,
      };
    }
    const tokenRecord = selectedSingleToken ?? singleTokens[0];
    if (!tokenRecord) return null;
    return {
      protocolVersion: 1,
      roomId,
      roomCode,
      hostIp: primaryIp,
      port,
      qrType: 'SINGLE_GAME',
      roomAuthToken: tokenRecord.token,
    };
  }, [
    serverActive,
    primaryIp,
    activeQrTab,
    roomId,
    roomCode,
    port,
    persistentToken,
    selectedSingleToken,
    singleTokens,
  ]);

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-[#072e1e] via-[#041d13] to-[#02100a] px-4 sm:px-8 py-4 sm:py-6 flex flex-col">
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto mb-4">
        <button
          type="button"
          onClick={() => {
            void handleStopServer();
            onBack();
          }}
          className="min-h-[44px] px-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 flex items-center gap-2 text-sm font-semibold text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <h1 className="font-display text-lg sm:text-2xl font-bold text-white">
          {connectionMethod === 'WIFI_DIRECT'
            ? 'Host Room Wi-Fi Direct'
            : 'Host Room Wi-Fi LAN'}
        </h1>

        <div className="w-[96px] hidden sm:block" />
      </div>

      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-4">
        {connectionMethod === 'WIFI_DIRECT' && wifiDirectInfo?.groupFormed && (
          <div className="rounded-xl bg-emerald-950/70 border border-emerald-400/35 px-4 py-2.5 text-xs sm:text-sm text-emerald-100">
            Grup Wi-Fi Direct aktif sebagai Group Owner · IP:{' '}
            <span className="font-mono-num font-bold text-amber-300">
              {wifiDirectInfo.groupOwnerAddress || '192.168.49.1'}
            </span>{' '}
            · SSID:{' '}
            <span className="font-mono-num text-white">
              {wifiDirectInfo.networkName || '-'}
            </span>
          </div>
        )}
        {!caps.localWebSocketServerSupported && (
          <div className="rounded-2xl bg-black/40 border border-amber-400/40 p-4 text-xs sm:text-sm text-amber-100">
            <div className="font-display font-bold text-amber-300 mb-1">
              Server WebSocket Native Android Belum Aktif di Browser
            </div>
            <p className="text-emerald-100/85 leading-relaxed">
              Pembuatan Room &amp; QR Host berjalan setelah server WebSocket
              lokal Android (<code className="font-mono">UnoLocalServerPlugin.kt</code>)
              aktif di APK Android Studio. QR tidak disimulasikan tanpa server lokal.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-red-950/80 border border-red-400/50 px-4 py-3 text-xs sm:text-sm text-red-100">
            {errorMsg}
          </div>
        )}

        {!serverActive ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-black/30 border border-emerald-400/15 p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1.5">
                  Maksimal Pemain (2–8)
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxPlayers(n)}
                      className={`min-h-[40px] rounded-lg font-display font-bold text-sm tabular-nums cursor-pointer ${
                        maxPlayers === n
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1.5">
                  Peran Host
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHostMode('PLAYER')}
                    className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-semibold cursor-pointer ${
                      hostMode === 'PLAYER'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    Ikut Bermain
                  </button>
                  <button
                    type="button"
                    onClick={() => setHostMode('SPECTATOR')}
                    className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-semibold cursor-pointer ${
                      hostMode === 'SPECTATOR'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    Pengelola (Spectator)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Isi Slot Kosong dengan BOT
                  </div>
                  <div className="text-xs text-emerald-100/70">
                    Kesulitan BOT: {botDifficulty}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFillBots((v) => !v)}
                  className={`min-h-[38px] px-4 rounded-lg text-xs font-bold cursor-pointer ${
                    fillBots
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {fillBots ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              {fillBots && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1.5">
                    Tingkat Kesulitan BOT
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'normal', 'hard'] as BotDifficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setBotDifficulty(d)}
                        className={`min-h-[38px] rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                          botDifficulty === d
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {d === 'easy' ? 'Mudah' : d === 'normal' ? 'Normal' : 'Sulit'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-black/30 border border-emerald-400/15 p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1.5">
                    Aturan Permainan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRules({ ...CLASSIC_RULES })}
                      className={`min-h-[42px] rounded-xl text-sm font-semibold cursor-pointer ${
                        rules.preset === 'CLASSIC'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      Classic
                    </button>
                    <button
                      type="button"
                      onClick={() => setRules({ ...DEFAULT_HOUSE_RULES })}
                      className={`min-h-[42px] rounded-xl text-sm font-semibold cursor-pointer ${
                        rules.preset === 'HOUSE_RULES'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      House Rules
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="host-port"
                    className="block text-xs font-semibold text-emerald-200/80 mb-1"
                  >
                    Port Server WebSocket Lokal
                  </label>
                  <input
                    id="host-port"
                    type="number"
                    min={1024}
                    max={65535}
                    value={port}
                    onChange={(e) =>
                      setPort(Number.parseInt(e.target.value, 10) || 8765)
                    }
                    className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-sm font-mono-num text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartServer}
                disabled={!caps.localWebSocketServerSupported}
                className={`min-h-[48px] w-full rounded-xl font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2 ${
                  caps.localWebSocketServerSupported
                    ? 'bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-slate-950 cursor-pointer'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <Server className="w-4 h-4" />
                <span>Buka Room &amp; Jalankan Server</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: Real QR Code Tabs & Manual Room Info */}
            <div className="rounded-2xl bg-black/35 border border-emerald-400/20 p-4 space-y-3">
              <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveQrTab('PERSISTENT_ROOM')}
                  className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold cursor-pointer ${
                    activeQrTab === 'PERSISTENT_ROOM'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-emerald-100/80'
                  }`}
                >
                  Persistent Room QR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQrTab('SINGLE_GAME')}
                  className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold cursor-pointer ${
                    activeQrTab === 'SINGLE_GAME'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-emerald-100/80'
                  }`}
                >
                  Single Game QR (1x)
                </button>
              </div>

              {activeQrPayload ? (
                <RealQrCodeDisplay
                  payload={activeQrPayload}
                  caption={
                    activeQrTab === 'PERSISTENT_ROOM'
                      ? 'Berlaku selama room aktif (termasuk rejoin)'
                      : selectedSingleToken?.consumed
                        ? `Terpakai oleh ${selectedSingleToken.usedByPlayerName ?? 'pemain'}`
                        : 'Token sekali pakai — hangus setelah 1 pemain bergabung'
                  }
                />
              ) : (
                <div className="text-xs text-amber-200 text-center py-6">
                  IP lokal perangkat tidak terdeteksi untuk QR.
                </div>
              )}

              {activeQrTab === 'SINGLE_GAME' && (
                <button
                  type="button"
                  onClick={handleIssueNewSingleToken}
                  className="min-h-[38px] w-full rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                  <span>Buat Token Single Game Baru</span>
                </button>
              )}

              <div className="border-t border-white/10 pt-2.5 space-y-1 text-xs">
                <div>
                  <span className="text-emerald-200/75">Room ID: </span>
                  <span className="font-mono-num text-white">{roomId}</span>
                </div>
                <div>
                  <span className="text-emerald-200/75">IP &amp; Port: </span>
                  <span className="font-mono-num font-bold text-white">
                    {hostIps.join(' / ')} : {port}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-200/75">Kode Manual: </span>
                  <span className="font-mono-num font-bold text-amber-300">
                    {roomCode}
                  </span>
                  <span className="text-emerald-200/75"> · Token: </span>
                  <span className="font-mono-num font-bold text-emerald-300">
                    {persistentToken}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Player Roster & Match Start */}
            <div className="rounded-2xl bg-black/35 border border-emerald-400/20 p-4 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-display font-bold text-base text-white tabular-nums">
                    Daftar Pemain ({roomSnapshot?.participants.length ?? 0}/
                    {maxPlayers})
                  </div>
                  <span className="text-xs text-emerald-200/75">
                    {hostMode === 'SPECTATOR' ? 'Host: Spectator' : 'Host: Ikut Main'}
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {roomSnapshot?.participants.length === 0 && (
                    <div className="text-xs text-emerald-100/60 py-4 text-center">
                      Belum ada pemain masuk. Pindai QR atau gunakan Kode Manual.
                    </div>
                  )}
                  {roomSnapshot?.participants.map((p) => (
                    <div
                      key={p.playerId}
                      className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between text-xs sm:text-sm"
                    >
                      <span className="font-semibold text-white">
                        {p.displayName} {p.isHost ? '(Host)' : ''}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-emerald-300">
                          {p.connected ? 'Terhubung' : 'Putus'}
                        </span>
                        {!p.isHost && (
                          <button
                            type="button"
                            onClick={() =>
                              managerRef.current?.kickPlayer(p.playerId)
                            }
                            className="text-red-300 hover:text-red-200 flex items-center gap-1 text-xs cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Keluarkan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleStartMatch}
                  className="min-h-[48px] w-full rounded-xl bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-slate-950 font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Mulai Permainan</span>
                </button>
                <button
                  type="button"
                  onClick={handleStopServer}
                  className="min-h-[40px] w-full rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Akhiri Room</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
