import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { ArrowLeft, Camera, ImageUp, Keyboard } from 'lucide-react';
import { parseQrPayload } from '../multiplayer/qrCodec';
import { QRConnectionPayload } from '../multiplayer/types';

interface QrScannerScreenProps {
  onBack: () => void;
  onManualJoin: () => void;
  onQrDecoded: (payload: QRConnectionPayload) => void;
}

export const QrScannerScreen: React.FC<QrScannerScreenProps> = ({
  onBack,
  onManualJoin,
  onQrDecoded,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [cameraStatus, setCameraStatus] = useState<
    'REQUESTING' | 'ACTIVE' | 'UNAVAILABLE'
  >('REQUESTING');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const stopCamera = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }
    };

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('UNAVAILABLE');
        setErrorMsg(
          'Kamera tidak tersedia pada browser/perangkat ini. Gunakan unggah gambar QR atau masukkan Kode Room Manual.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (!active) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraStatus('ACTIVE');

        const scanFrame = () => {
          if (!active) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (
            video &&
            canvas &&
            video.readyState === video.HAVE_ENOUGH_DATA &&
            video.videoWidth > 0
          ) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const decoded = jsQR(imgData.data, imgData.width, imgData.height);
              if (decoded?.data) {
                const parsed = parseQrPayload(decoded.data);
                if (parsed.ok) {
                  stopCamera();
                  onQrDecoded(parsed.payload);
                  return;
                }
                setErrorMsg(parsed.error);
              }
            }
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        };

        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        if (!active) return;
        setCameraStatus('UNAVAILABLE');
        setErrorMsg(
          err instanceof Error
            ? `Izin kamera ditolak atau tidak tersedia (${err.message}).`
            : 'Gagal mengakses kamera perangkat.'
        );
      }
    };

    void startScanner();

    return () => {
      active = false;
      stopCamera();
    };
  }, [onQrDecoded]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setErrorMsg('Gagal membaca kanvas gambar.');
        return;
      }
      ctx.drawImage(bitmap, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imgData.data, imgData.width, imgData.height);
      if (!decoded?.data) {
        setErrorMsg('QR Code tidak ditemukan pada gambar tersebut.');
        return;
      }
      const parsed = parseQrPayload(decoded.data);
      if (!parsed.ok) {
        setErrorMsg(parsed.error);
        return;
      }
      onQrDecoded(parsed.payload);
    } catch {
      setErrorMsg('Gagal memproses file gambar QR Code.');
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-[#072e1e] via-[#041d13] to-[#02100a] px-4 sm:px-8 py-4 sm:py-6 flex flex-col">
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto mb-4">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 flex items-center gap-2 text-sm font-semibold text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <h1 className="font-display text-lg sm:text-2xl font-bold text-white">
          QR Scanner Room
        </h1>

        <button
          type="button"
          onClick={onManualJoin}
          className="min-h-[44px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5 cursor-pointer"
        >
          <Keyboard className="w-4 h-4 text-amber-300" />
          <span>Kode Manual</span>
        </button>
      </div>

      <div className="max-w-4xl w-full mx-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
        {/* Camera Preview Viewport */}
        <div className="relative rounded-2xl bg-black/60 border border-emerald-400/25 overflow-hidden aspect-video sm:aspect-[4/3] flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${
              cameraStatus === 'ACTIVE' ? 'block' : 'hidden'
            }`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {cameraStatus === 'ACTIVE' && (
            <div className="pointer-events-none absolute inset-6 border-2 border-amber-300/80 rounded-2xl" />
          )}

          {cameraStatus !== 'ACTIVE' && (
            <div className="p-5 text-center space-y-2">
              <Camera className="w-10 h-10 text-emerald-300/70 mx-auto" />
              <div className="text-sm font-semibold text-white">
                {cameraStatus === 'REQUESTING'
                  ? 'Meminta izin kamera...'
                  : 'Kamera Tidak Tersedia'}
              </div>
              <p className="text-xs text-emerald-100/70">
                Gunakan file gambar QR atau masuk dengan Kode Room Manual.
              </p>
            </div>
          )}
        </div>

        {/* Controls & Image Fallback */}
        <div className="rounded-2xl bg-black/35 border border-white/10 p-5 space-y-4">
          <div>
            <h2 className="font-display font-bold text-base text-white mb-1">
              Arahkan Kamera ke QR Host
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              Mendukung <strong>Persistent Room QR</strong> maupun{' '}
              <strong>Single Game QR</strong> (token sekali pakai). Pemindaian
              memakai kamera asli perangkat tanpa simulasi.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-950/80 border border-red-400/50 px-3.5 py-2.5 text-xs text-red-100">
              {errorMsg}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[46px] w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <ImageUp className="w-4 h-4" />
              <span>Baca QR dari Gambar / Screenshot</span>
            </button>

            <button
              type="button"
              onClick={onManualJoin}
              className="min-h-[44px] w-full rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
              <span>Masukkan Kode Room Manual</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
