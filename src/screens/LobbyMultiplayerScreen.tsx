import React from 'react';
import { ArrowLeft, Keyboard, QrCode, Radio, Server, Wifi } from 'lucide-react';
import { MabarUnoLogo } from '../components/MabarUnoLogo';
import { getNativeMultiplayerCapabilities } from '../multiplayer/nativeBridge';

interface LobbyMultiplayerScreenProps {
  onBack: () => void;
  onOpenHostRoom: () => void;
  onOpenQrScanner: () => void;
  onOpenJoinManual: () => void;
  onOpenWifiDirect: () => void;
}

export const LobbyMultiplayerScreen: React.FC<LobbyMultiplayerScreenProps> = ({
  onBack,
  onOpenHostRoom,
  onOpenQrScanner,
  onOpenJoinManual,
  onOpenWifiDirect,
}) => {
  const caps = getNativeMultiplayerCapabilities();

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-[#072e1e] via-[#041d13] to-[#02100a] px-4 sm:px-8 py-4 sm:py-6 safe-pt safe-pb flex flex-col">
      <div className="flex items-center justify-between gap-3 max-w-5xl w-full mx-auto mb-4">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 flex items-center gap-2 text-sm font-semibold text-white cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <MabarUnoLogo variant="icon" className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-xl font-extrabold text-white truncate">
              Lobby Multiplayer MABAR UNO
            </h1>
            <p className="text-[11px] text-emerald-200/75 hidden sm:block">
              Main Bareng via Wi-Fi LAN &amp; Wi-Fi Direct Tanpa Internet
            </p>
          </div>
        </div>

        <div className="w-[88px] hidden sm:block" />
      </div>

      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col justify-center gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-black/35 border border-emerald-400/25 p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-300 font-display font-bold text-base mb-2">
                <Server className="w-5 h-5" />
                <span>Buat Room (Host LAN)</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                Atur 2–8 pemain, mode Pemain/Spectator, Persistent &amp; Single
                Game QR Code, serta server WebSocket lokal Android.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenHostRoom}
              className="min-h-[48px] w-full rounded-xl bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 active:translate-y-0.5 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              Buat Room Host
            </button>
          </div>

          <div className="rounded-2xl bg-black/35 border border-emerald-400/25 p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-300 font-display font-bold text-base mb-2">
                <QrCode className="w-5 h-5" />
                <span>Scan QR Room</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                Pindai Persistent Room QR atau Single Game QR langsung lewat
                kamera perangkat atau unggah gambar QR.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenQrScanner}
              className="min-h-[48px] w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              Buka QR Scanner
            </button>
          </div>

          <div className="rounded-2xl bg-black/35 border border-emerald-400/25 p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-300 font-display font-bold text-base mb-2">
                <Keyboard className="w-5 h-5" />
                <span>Kode Room Manual</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                Masuk tanpa kamera menggunakan IP Host, Port, Kode Room 6 huruf,
                dan Token room (mendukung reconnect otomatis).
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenJoinManual}
              className="min-h-[48px] w-full rounded-xl bg-white/15 hover:bg-white/20 border-b-4 border-black/40 active:translate-y-0.5 text-white font-display font-bold text-sm cursor-pointer"
            >
              Gabung Kode Manual
            </button>
          </div>
        </div>

        {/* Wi-Fi Direct Android Native (WifiP2pManager) */}
        <div className="rounded-2xl bg-black/35 border border-emerald-400/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Radio
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                caps.wifiDirectSupported ? 'text-emerald-300' : 'text-amber-300'
              }`}
            />
            <div>
              <div className="text-sm font-bold text-white">
                Wi-Fi Direct (Android WifiP2pManager){' '}
                <span className="text-xs font-normal text-emerald-200/75">
                  ·{' '}
                  {caps.wifiDirectSupported
                    ? 'Siap di Android'
                    : 'Membutuhkan APK Android'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/75 mt-0.5">
                Hubungkan perangkat langsung secara peer-to-peer tanpa router
                atau hotspot, lalu jalankan server WebSocket lokal melalui Group
                Owner.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenWifiDirect}
            className="min-h-[44px] px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/35 text-emerald-200 font-display font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            Kelola Wi-Fi Direct
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-200/70">
          <Wifi className="w-4 h-4 shrink-0" />
          <span>{caps.reason}</span>
        </div>
      </div>
    </div>
  );
};
