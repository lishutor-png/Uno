import React, { useEffect, useState } from 'react';
import { Check, Copy, Maximize2, Users, X } from 'lucide-react';
import { generateQrDataUrl } from '../multiplayer/qrCodec';
import { QRConnectionPayload } from '../multiplayer/types';

interface RealQrCodeDisplayProps {
  payload: QRConnectionPayload;
  caption: string;
  joinedCount?: number;
  maxPlayers?: number;
  roomStatusLabel?: string;
}

async function copyTextWithFallback(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const RealQrCodeDisplay: React.FC<RealQrCodeDisplayProps> = ({
  payload,
  caption,
  joinedCount,
  maxPlayers,
  roomStatusLabel,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [largeDataUrl, setLargeDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      generateQrDataUrl(payload, 360),
      generateQrDataUrl(payload, 560),
    ])
      .then(([stdUrl, bigUrl]) => {
        if (!cancelled) {
          setDataUrl(stdUrl);
          setLargeDataUrl(bigUrl);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Gagal membuat QR Code.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  const handleCopyCode = async () => {
    const ok = await copyTextWithFallback(payload.roomCode);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        {/* Clean white quiet zone, zero overlays over QR pattern */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xl border-2 border-emerald-200/80">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={caption}
              className="w-52 h-52 sm:w-64 sm:h-64 block"
            />
          ) : error ? (
            <div className="w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center text-center text-xs text-red-700 p-3">
              {error}
            </div>
          ) : (
            <div className="w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center text-xs text-slate-600">
              Membuat QR...
            </div>
          )}
        </div>

        <span className="text-[11px] sm:text-xs text-emerald-100/85 text-center leading-snug max-w-xs">
          {caption}
        </span>

        {/* Clear Room Code + Copy + Enlarge Button */}
        <div className="w-full rounded-xl bg-black/45 border border-white/15 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-emerald-200/75 font-semibold">
              Kode Ruangan
            </div>
            <div className="font-mono-num text-xl font-black tracking-widest text-amber-300">
              {payload.roomCode}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[42px] px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-300" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!dataUrl}
              onClick={() => setIsExpanded(true)}
              className="min-h-[42px] px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 border-b-2 border-amber-600 text-xs font-display font-extrabold text-slate-950 flex items-center gap-1.5 cursor-pointer disabled:opacity-45"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>PERBESAR QR</span>
            </button>
          </div>
        </div>

        {/* Joined Players Count & Room Status */}
        {(typeof joinedCount === 'number' || roomStatusLabel) && (
          <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs px-1">
            {typeof joinedCount === 'number' && typeof maxPlayers === 'number' && (
              <div className="flex items-center gap-1.5 text-emerald-100/90 font-semibold tabular-nums">
                <Users className="w-3.5 h-3.5 text-emerald-300" />
                <span>
                  Pemain Bergabung: {joinedCount}/{maxPlayers}
                </span>
              </div>
            )}
            {roomStatusLabel && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-400/35 text-amber-300 font-bold">
                {roomStatusLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen High-Contrast Enlarged QR Modal */}
      {isExpanded && (largeDataUrl || dataUrl) && (
        <div
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex items-center justify-center p-4 safe-pt safe-pb overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Tampilan QR Code Diperbesar"
        >
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0a3824] to-[#041d13] border border-emerald-400/35 shadow-2xl p-5 sm:p-6 flex flex-col items-center gap-4 text-white">
            <div className="w-full flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display font-extrabold text-base sm:text-lg text-amber-300">
                  Scan QR Room MABAR UNO
                </h2>
                {roomStatusLabel && (
                  <p className="text-xs text-emerald-200/85 font-semibold">
                    Status: {roomStatusLabel}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                aria-label="Tutup QR diperbesar"
                className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Extra-generous white quiet zone with zero decorative interference */}
            <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-2xl">
              <img
                src={largeDataUrl ?? dataUrl ?? ''}
                alt={caption}
                className="w-[min(74vw,46vh,340px)] h-[min(74vw,46vh,340px)] block"
              />
            </div>

            <div className="w-full rounded-2xl bg-black/45 border border-white/15 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-emerald-200/75 font-semibold">
                  Kode Ruangan
                </div>
                <div className="font-mono-num text-2xl sm:text-3xl font-black tracking-widest text-amber-300">
                  {payload.roomCode}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-[46px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 border-b-2 border-amber-600 text-xs sm:text-sm font-display font-extrabold text-slate-950 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Kode</span>
                  </>
                )}
              </button>
            </div>

            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-100/85">
              {typeof joinedCount === 'number' && typeof maxPlayers === 'number' && (
                <span className="font-semibold tabular-nums">
                  Pemain Bergabung: {joinedCount}/{maxPlayers}
                </span>
              )}
              <span className="font-mono-num text-emerald-200/80">
                {payload.hostIp}:{payload.port}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="min-h-[46px] w-full rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold text-white cursor-pointer"
            >
              Tutup Tampilan QR
            </button>
          </div>
        </div>
      )}
    </>
  );
};
