import React, { useEffect, useState } from 'react';
import { generateQrDataUrl } from '../multiplayer/qrCodec';
import { QRConnectionPayload } from '../multiplayer/types';

interface RealQrCodeDisplayProps {
  payload: QRConnectionPayload;
  caption: string;
}

export const RealQrCodeDisplay: React.FC<RealQrCodeDisplayProps> = ({
  payload,
  caption,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    generateQrDataUrl(payload)
      .then((url) => {
        if (!cancelled) setDataUrl(url);
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

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-white p-2.5 shadow-lg border-2 border-emerald-200/80">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={caption}
            className="w-40 h-40 sm:w-44 sm:h-44 block"
          />
        ) : error ? (
          <div className="w-40 h-40 flex items-center justify-center text-center text-xs text-red-700 p-2">
            {error}
          </div>
        ) : (
          <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-600">
            Membuat QR...
          </div>
        )}
      </div>
      <span className="text-[11px] sm:text-xs text-emerald-100/80 text-center">
        {caption}
      </span>
    </div>
  );
};
