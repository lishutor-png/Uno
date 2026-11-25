import React from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import {
  HandLayoutMode,
  MatchHistoryRecord,
  OrientationPreference,
  UserPreferences,
} from '../storage/types';
import { DIFFICULTY_LABELS_ID, formatDuration } from '../utilities/cardHelpers';

interface SettingsScreenProps {
  preferences: UserPreferences;
  matchHistory: MatchHistoryRecord[];
  onUpdatePreferences: (partial: Partial<UserPreferences>) => void;
  onClearHistory: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  preferences,
  matchHistory,
  onUpdatePreferences,
  onClearHistory,
  onBack,
}) => {
  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-[#072e1e] via-[#041d13] to-[#02100a] px-4 sm:px-8 py-4 sm:py-6 safe-pt safe-pb flex flex-col">
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto mb-4">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[48px] px-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 flex items-center gap-2 text-sm font-semibold text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <h1 className="font-display text-lg sm:text-2xl font-bold text-white">
          Pengaturan &amp; Riwayat
        </h1>

        <div className="w-[96px] hidden sm:block" />
      </div>

      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 flex-1">
        {/* Left: User Preferences */}
        <div className="rounded-2xl bg-black/30 border border-emerald-400/15 p-4 sm:p-5 space-y-4">
          <h2 className="font-display text-base font-bold text-white">
            Preferensi Permainan
          </h2>

          <div>
            <label
              htmlFor="settings-player-name"
              className="block text-xs font-medium text-emerald-200/80 mb-1.5"
            >
              Nama Pemain
            </label>
            <input
              id="settings-player-name"
              type="text"
              maxLength={16}
              value={preferences.playerName}
              onChange={(e) =>
                onUpdatePreferences({ playerName: e.target.value })
              }
              className="w-full min-h-[44px] rounded-xl bg-black/40 border border-white/15 px-3.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5">
            <div>
              <div className="text-sm font-semibold text-white">Efek Suara</div>
              <div className="text-xs text-emerald-100/70">
                Suara kartu, aksi spesial, dan UNO
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdatePreferences({ soundEnabled: !preferences.soundEnabled })
              }
              className={`min-h-[40px] px-4 rounded-lg font-bold text-xs cursor-pointer ${
                preferences.soundEnabled
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {preferences.soundEnabled ? 'Nyala' : 'Mati'}
            </button>
          </div>

          <div>
            <span className="block text-xs font-medium text-emerald-200/80 mb-1.5">
              Tampilan Kartu Tangan Default
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['fan', 'stack'] as HandLayoutMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdatePreferences({ handLayoutMode: mode })}
                  className={`min-h-[48px] rounded-xl font-semibold text-sm cursor-pointer ${
                    preferences.handLayoutMode === mode
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  {mode === 'fan' ? 'Mode Kipas' : 'Mode Tumpuk'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-emerald-200/80 mb-1.5">
              Orientasi Layar
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'auto', label: 'Otomatis' },
                  { id: 'portrait', label: 'Portrait' },
                  { id: 'landscape', label: 'Landscape' },
                ] as Array<{ id: OrientationPreference; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({ orientationPreference: opt.id })
                  }
                  className={`min-h-[48px] rounded-xl font-semibold text-xs sm:text-sm cursor-pointer ${
                    preferences.orientationPreference === opt.id
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-100/70 leading-relaxed">
              Otomatis: Menu &amp; Solo menggunakan Portrait; Multiplayer 2–4
              pemain fleksibel; Multiplayer 5–8 pemain menggunakan Landscape.
            </p>
          </div>
        </div>

        {/* Right: Match History */}
        <div className="rounded-2xl bg-black/30 border border-emerald-400/15 p-4 sm:p-5 flex flex-col max-h-[380px] md:max-h-none">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-bold text-white">
              Riwayat Pertandingan
            </h2>
            {matchHistory.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="min-h-[36px] px-3 rounded-lg bg-red-600/25 hover:bg-red-600/45 text-red-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>

          {matchHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center py-8 text-xs sm:text-sm text-emerald-100/60">
              Belum ada pertandingan yang tercatat. Selesaikan 1 match untuk melihat skor.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {matchHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {item.playerWon ? 'Menang' : `Juara: ${item.winnerName}`}
                    </div>
                    <div className="text-xs text-emerald-100/70 tabular-nums">
                      {item.totalPlayers} Pemain
                      {item.botDifficulty
                        ? ` · ${DIFFICULTY_LABELS_ID[item.botDifficulty]}`
                        : ''}
                      {' · '}
                      {item.rulePreset === 'CLASSIC' ? 'Classic' : 'House Rules'}
                      {' · '}
                      {formatDuration(item.durationSeconds)}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono-num text-sm font-bold text-amber-300">
                    {item.pointsEarned} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
