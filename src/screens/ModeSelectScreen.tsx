import React, { useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { CLASSIC_RULES, DEFAULT_HOUSE_RULES } from '../engine/rules';
import {
  BotDifficulty,
  RoomRuleConfig,
  SinglePlayerSetupConfig,
} from '../engine/types';

interface ModeSelectScreenProps {
  playerName: string;
  initialTotalPlayers: number;
  initialDifficulty: BotDifficulty;
  initialRules: RoomRuleConfig;
  onBack: () => void;
  onLaunchMatch: (config: SinglePlayerSetupConfig) => void;
}

const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8];

const DIFFICULTIES: Array<{
  value: BotDifficulty;
  label: string;
  hint: string;
}> = [
  { value: 'easy', label: 'Mudah', hint: 'BOT memilih kartu legal secara acak.' },
  { value: 'normal', label: 'Normal', hint: 'BOT memprioritaskan warna & kartu aksi.' },
  {
    value: 'hard',
    label: 'Sulit',
    hint: 'BOT membaca sisa kartu lawan & menahan Wild.',
  },
];

export const ModeSelectScreen: React.FC<ModeSelectScreenProps> = ({
  playerName,
  initialTotalPlayers,
  initialDifficulty,
  initialRules,
  onBack,
  onLaunchMatch,
}) => {
  const [totalPlayers, setTotalPlayers] = useState(initialTotalPlayers);
  const [difficulty, setDifficulty] = useState<BotDifficulty>(initialDifficulty);
  const [rules, setRules] = useState<RoomRuleConfig>(initialRules);

  const selectPreset = (preset: RoomRuleConfig['preset']) => {
    if (preset === 'CLASSIC') {
      setRules({ ...CLASSIC_RULES });
    } else {
      setRules({ ...DEFAULT_HOUSE_RULES });
    }
  };

  const toggleRule = (
    key: 'stackPlus2' | 'stackPlus4' | 'stackPlus2AndPlus4' | 'unoPenalty'
  ) => {
    setRules((prev) => {
      const next = { ...prev, preset: 'HOUSE_RULES' as const, [key]: !prev[key] };
      // Cross-stacking requires both stackPlus2 and stackPlus4
      if (key === 'stackPlus2AndPlus4' && next.stackPlus2AndPlus4) {
        next.stackPlus2 = true;
        next.stackPlus4 = true;
      }
      if ((key === 'stackPlus2' || key === 'stackPlus4') && !next[key]) {
        next.stackPlus2AndPlus4 = false;
      }
      return next;
    });
  };

  const handleStart = () => {
    onLaunchMatch({
      playerName,
      totalPlayers,
      botDifficulty: difficulty,
      rules,
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-[#072e1e] via-[#041d13] to-[#02100a] px-4 sm:px-8 py-4 sm:py-6 safe-pt safe-pb flex flex-col">
      {/* Header */}
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
          Pengaturan Solo vs BOT
        </h1>

        <div className="w-[96px] hidden sm:block" />
      </div>

      {/* Main 2-column landscape configuration grid */}
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 flex-1">
        {/* Left column: Player count & Bot difficulty */}
        <div className="rounded-2xl bg-black/30 border border-emerald-400/15 p-4 sm:p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">
                Jumlah Total Pemain
              </span>
              <span className="text-xs text-amber-300 font-medium tabular-nums">
                1 Manusia + {totalPlayers - 1} BOT
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {PLAYER_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTotalPlayers(n)}
                  className={`min-h-[44px] rounded-xl font-display font-bold text-base tabular-nums cursor-pointer transition-colors ${
                    totalPlayers === n
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-white mb-2">
              Kecerdasan BOT
            </span>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl font-semibold text-sm cursor-pointer transition-colors ${
                    difficulty === d.value
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-emerald-100/75">
              {DIFFICULTIES.find((d) => d.value === difficulty)?.hint}
            </p>
          </div>
        </div>

        {/* Right column: Ruleset & House Rules */}
        <div className="rounded-2xl bg-black/30 border border-emerald-400/15 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <span className="block text-sm font-semibold text-white mb-2">
              Pilihan Aturan
            </span>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => selectPreset('CLASSIC')}
                className={`min-h-[44px] rounded-xl font-semibold text-sm cursor-pointer transition-colors ${
                  rules.preset === 'CLASSIC'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                Classic UNO
              </button>
              <button
                type="button"
                onClick={() => selectPreset('HOUSE_RULES')}
                className={`min-h-[44px] rounded-xl font-semibold text-sm cursor-pointer transition-colors ${
                  rules.preset === 'HOUSE_RULES'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                House Rules
              </button>
            </div>

            <div className="space-y-2">
              <RuleToggleRow
                label="Stacking +2"
                checked={rules.stackPlus2}
                onToggle={() => toggleRule('stackPlus2')}
              />
              <RuleToggleRow
                label="Stacking +4"
                checked={rules.stackPlus4}
                onToggle={() => toggleRule('stackPlus4')}
              />
              <RuleToggleRow
                label="Tumpuk +2 dan +4 Saling Silang"
                checked={rules.stackPlus2AndPlus4}
                onToggle={() => toggleRule('stackPlus2AndPlus4')}
              />
              <RuleToggleRow
                label="Penalti Lupa Tekan UNO (+2 Kartu)"
                checked={rules.unoPenalty}
                onToggle={() => toggleRule('unoPenalty')}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="mt-4 w-full min-h-[48px] rounded-xl bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Mulai Pertandingan</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function RuleToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={checked}
      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left cursor-pointer"
    >
      <span className="text-xs sm:text-sm text-emerald-50">{label}</span>
      <span
        className={`text-xs font-bold ${
          checked ? 'text-amber-300' : 'text-slate-400'
        }`}
      >
        {checked ? 'Aktif' : 'Nonaktif'}
      </span>
    </button>
  );
}
