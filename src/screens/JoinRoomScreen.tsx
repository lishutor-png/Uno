import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LogIn, QrCode, RefreshCw } from 'lucide-react';
import {
  LanClientState,
  LanWebSocketClient,
} from '../multiplayer/lanClient';
import {
  QRConnectionPayload,
  RoomPublicSnapshot,
} from '../multiplayer/types';

interface JoinRoomScreenProps {
  playerName: string;
  initialQrPayload?: QRConnectionPayload | null;
  initialHostIp?: string | null;
  onBack: () => void;
  onOpenScanner: () => void;
  onGameStarted: (
    client: LanWebSocketClient,
    initialState: LanClientState
  ) => void;
}

export const JoinRoomScreen: React.FC<JoinRoomScreenProps> = ({
  playerName,
  initialQrPayload = null,
  initialHostIp = null,
  onBack,
  onOpenScanner,
  onGameStarted,
}) => {
  const [hostIp, setHostIp] = useState(
    initialQrPayload?.hostIp ?? initialHostIp ?? '192.168.43.1'
  );
  const [port, setPort] = useState(initialQrPayload?.port ?? 8765);
  const [roomId, setRoomId] = useState(initialQrPayload?.roomId ?? '');
  const [roomCode, setRoomCode] = useState(initialQrPayload?.roomCode ?? '');
  const [authToken, setAuthToken] = useState(
    initialQrPayload?.roomAuthToken ?? ''
  );

  const [clientState, setClientState] = useState<LanClientState | null>(null);
  const clientRef = useRef<LanWebSocketClient | null>(null);
  const handedOffRef = useRef(false);

  const startConnection = (
    targetIp: string,
    targetPort: number,
    targetRoomId: string,
    targetRoomCode: string,
    targetToken: string,
    qrType?: QRConnectionPayload['qrType']
  ) => {
    clientRef.current?.destroy();

    const client = new LanWebSocketClient({
      hostIp: targetIp,
      port: targetPort,
      roomId: targetRoomId || undefined,
      roomCode: targetRoomCode,
      roomAuthToken: targetToken,
      qrType,
      playerName,
      onStateChange: (next) => {
        setClientState(next);
        if (next.gameState && next.room && !handedOffRef.current) {
          handedOffRef.current = true;
          onGameStarted(client, next);
        }
      },
    });

    clientRef.current = client;
    client.connect();
  };

  // Auto-connect if arrived via real scanned QR Code
  useEffect(() => {
    if (initialQrPayload) {
      startConnection(
        initialQrPayload.hostIp,
        initialQrPayload.port,
        initialQrPayload.roomId,
        initialQrPayload.roomCode,
        initialQrPayload.roomAuthToken,
        initialQrPayload.qrType
      );
    }
    return () => {
      if (!handedOffRef.current) {
        clientRef.current?.leaveRoom();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQrPayload]);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    startConnection(hostIp, port, roomId, roomCode, authToken);
  };

  const handleDisconnect = () => {
    clientRef.current?.leaveRoom();
    clientRef.current = null;
    setClientState(null);
  };

  const isAuthenticated = clientState?.status === 'AUTHENTICATED';
  const room: RoomPublicSnapshot | null = clientState?.room ?? null;

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-[#072e1e] via-[#041d13] to-[#02100a] px-4 sm:px-8 py-4 sm:py-6 flex flex-col">
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto mb-4">
        <button
          type="button"
          onClick={() => {
            handleDisconnect();
            onBack();
          }}
          className="min-h-[44px] px-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 flex items-center gap-2 text-sm font-semibold text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <h1 className="font-display text-lg sm:text-2xl font-bold text-white">
          Gabung Room Wi-Fi LAN
        </h1>

        <button
          type="button"
          onClick={() => {
            handleDisconnect();
            onOpenScanner();
          }}
          className="min-h-[44px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5 cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-emerald-300" />
          <span>Scan QR</span>
        </button>
      </div>

      <div className="max-w-4xl w-full mx-auto flex-1 flex items-center justify-center">
        {!isAuthenticated ? (
          <form
            onSubmit={handleConnect}
            className="w-full max-w-lg rounded-2xl bg-black/35 border border-emerald-400/20 p-5 sm:p-6 space-y-4"
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label
                  htmlFor="join-ip"
                  className="block text-xs font-semibold text-emerald-200/80 mb-1"
                >
                  Alamat IP HP Host
                </label>
                <input
                  id="join-ip"
                  type="text"
                  required
                  value={hostIp}
                  onChange={(e) => setHostIp(e.target.value)}
                  placeholder="192.168.43.1"
                  className="w-full min-h-[44px] rounded-xl bg-black/45 border border-white/15 px-3 text-sm font-mono-num text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="join-port"
                  className="block text-xs font-semibold text-emerald-200/80 mb-1"
                >
                  Port
                </label>
                <input
                  id="join-port"
                  type="number"
                  required
                  value={port}
                  onChange={(e) =>
                    setPort(Number.parseInt(e.target.value, 10) || 8765)
                  }
                  className="w-full min-h-[44px] rounded-xl bg-black/45 border border-white/15 px-3 text-sm font-mono-num text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="join-code"
                  className="block text-xs font-semibold text-emerald-200/80 mb-1"
                >
                  Kode Room Manual
                </label>
                <input
                  id="join-code"
                  type="text"
                  required
                  maxLength={8}
                  value={roomCode}
                  onChange={(e) => {
                    setRoomId('');
                    setRoomCode(e.target.value.toUpperCase());
                  }}
                  placeholder="ABC123"
                  className="w-full min-h-[44px] rounded-xl bg-black/45 border border-white/15 px-3 text-sm font-mono-num uppercase text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="join-token"
                  className="block text-xs font-semibold text-emerald-200/80 mb-1"
                >
                  Token Autentikasi
                </label>
                <input
                  id="join-token"
                  type="text"
                  required
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Token room"
                  className="w-full min-h-[44px] rounded-xl bg-black/45 border border-white/15 px-3 text-sm font-mono-num text-white"
                />
              </div>
            </div>

            {clientState?.errorMessage && (
              <div className="rounded-xl bg-red-950/80 border border-red-400/50 px-3.5 py-2.5 text-xs text-red-100">
                {clientState.errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={clientState?.status === 'CONNECTING'}
              className="min-h-[48px] w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 text-slate-950 font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              {clientState?.status === 'CONNECTING' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menghubungkan ke Host...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Hubungkan &amp; Masuk Room</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="w-full max-w-lg rounded-2xl bg-black/35 border border-emerald-400/25 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-lg text-white">
                  Room {room?.roomCode}{' '}
                  <span className="text-xs font-mono-num text-emerald-200/75">
                    ({room?.roomId})
                  </span>
                </div>
                <div className="text-xs text-emerald-200/80 tabular-nums">
                  Terhubung ke {hostIp}:{port}
                  {clientState?.latencyMs ? ` · ${clientState.latencyMs} ms` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="min-h-[38px] px-3.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
              >
                Keluar
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {room?.participants.map((p) => (
                <div
                  key={p.playerId}
                  className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 flex items-center justify-between text-sm"
                >
                  <span className="font-semibold text-white">
                    {p.displayName} {p.isHost ? '(Host)' : ''}
                  </span>
                  <span className="text-xs text-emerald-300">
                    {p.connected ? 'Siap' : 'Terputus'}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-center text-xs sm:text-sm text-amber-300 font-medium">
              Menunggu Host memulai pertandingan...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
