import React from 'react';
import { X } from 'lucide-react';
import { MabarUnoLogo } from './MabarUnoLogo';
import { UnoCard } from './UnoCard';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="howto-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0a3824] to-[#041d13] border border-emerald-400/30 shadow-[0_24px_64px_rgba(0,0,0,0.75)] p-5 sm:p-6 text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <MabarUnoLogo variant="icon" className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <h2 id="howto-title" className="font-display font-extrabold text-lg sm:text-2xl text-amber-300 truncate">
                Cara Bermain MABAR UNO
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-200/80">
                MABAR = Main Bareng UNO · Offline Solo &amp; Wi-Fi Lokal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
          <div className="space-y-3">
            <div>
              <h3 className="font-display font-bold text-white text-sm sm:text-base mb-1">
                1. Tujuan &amp; Alur Permainan
              </h3>
              <p>
                Setiap pemain mendapat <strong>7 kartu awal</strong>. Pada
                giliranmu, mainkan kartu yang cocok dengan{' '}
                <strong>warna</strong>, <strong>angka</strong>, atau{' '}
                <strong>simbol</strong> kartu teratas di tengah meja, atau
                ambil kartu dari tumpukan Draw Pile. Pemain pertama yang
                menghabiskan seluruh kartunya menang.
              </p>
            </div>

            <div>
              <h3 className="font-display font-bold text-white text-sm sm:text-base mb-1">
                2. Tombol UNO! &amp; Penalti
              </h3>
              <p>
                Saat sisa kartu tinggal <strong>2 atau 1 kartu</strong>, tekan
                tombol <strong>UNO!</strong> agar terlindungi. Jika lupa menekan
                UNO dan tertangkap lawan, kamu terkena penalti{' '}
                <strong>+2 kartu</strong>.
              </p>
            </div>

            <div>
              <h3 className="font-display font-bold text-white text-sm sm:text-base mb-1">
                3. Classic vs House Rules
              </h3>
              <p>
                <strong>Classic:</strong> mengikuti aturan resmi UNO standar.{' '}
                <strong>House Rules:</strong> mendukung penumpukan kartu{' '}
                <strong>+2</strong> / <strong>+4</strong> (Stacking) sesuai
                pengaturan room.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-display font-bold text-white text-sm sm:text-base">
              4. Mengenal Kartu Aksi UNO
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-center gap-3 rounded-xl bg-black/30 border border-white/10 p-2.5">
                <UnoCard
                  card={{ id: 'ht_skip', color: 'green', value: 'skip' }}
                  size="sm"
                  className="shrink-0"
                />
                <div>
                  <div className="font-bold text-white">Skip (Lewati)</div>
                  <div className="text-xs text-emerald-100/75">
                    Pemain berikutnya kehilangan 1 giliran.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-black/30 border border-white/10 p-2.5">
                <UnoCard
                  card={{ id: 'ht_rev', color: 'yellow', value: 'reverse' }}
                  size="sm"
                  className="shrink-0"
                />
                <div>
                  <div className="font-bold text-white">Reverse (Putar Arah)</div>
                  <div className="text-xs text-emerald-100/75">
                    Membalik arah putaran meja (berfungsi sebagai Skip pada 2 pemain).
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-black/30 border border-white/10 p-2.5">
                <UnoCard
                  card={{ id: 'ht_d2', color: 'blue', value: 'draw2' }}
                  size="sm"
                  className="shrink-0"
                />
                <div>
                  <div className="font-bold text-white">Draw Two (+2)</div>
                  <div className="text-xs text-emerald-100/75">
                    Lawan berikutnya mengambil 2 kartu &amp; melewatkan giliran.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-black/30 border border-white/10 p-2.5">
                <UnoCard
                  card={{ id: 'ht_w4', color: 'wild', value: 'wild4' }}
                  size="sm"
                  className="shrink-0"
                />
                <div>
                  <div className="font-bold text-white">Wild &amp; Wild +4</div>
                  <div className="text-xs text-emerald-100/75">
                    Ubah warna aktif meja; Wild +4 juga memberi penalti +4 kartu.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 rounded-xl bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-slate-950 font-display font-bold text-sm cursor-pointer"
          >
            Mengerti, Siap Main
          </button>
        </div>
      </div>
    </div>
  );
};
