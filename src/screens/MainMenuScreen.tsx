import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Gamepad2,
  Settings,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { MabarUnoLogo } from '../components/MabarUnoLogo';
import { UnoMenuHeroIllustration } from '../components/UnoMenuHeroIllustration';
import { MatchHistoryRecord } from '../storage/types';
import { soundEngine } from '../utilities/soundEngine';

interface MainMenuScreenProps {
  playerName: string;
  soundEnabled: boolean;
  matchHistory: MatchHistoryRecord[];
  onChangePlayerName: (name: string) => void;
  onToggleSound: () => void;
  onStartSinglePlayer: () => void;
  onOpenMultiplayer: () => void;
  onOpenSettings: () => void;
}

const ARENA_HERO_BG = '/src/assets/images/uno_arena_front_bg_1795600627346.jpg';

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({
  playerName,
  soundEnabled,
  matchHistory,
  onChangePlayerName,
  onToggleSound,
  onStartSinglePlayer,
  onOpenMultiplayer,
  onOpenSettings,
}) => {
  const [bgLoaded, setBgLoaded] = useState(true);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const wins = matchHistory.filter((m) => m.playerWon).length;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        showHowToPlay ||
        (document.activeElement && document.activeElement.tagName === 'INPUT')
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartSinglePlayer();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartSinglePlayer, showHowToPlay]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-[#062a1b] via-[#041a10] to-[#020d08] flex flex-col animate-screen-enter">
      {/* Front-perspective luxury card-arena table backdrop (zero poker cards) */}
      {bgLoaded && (
        <img
          src={ARENA_HERO_BG}
          alt="Meja permainan kartu hijau MABAR UNO dengan pencahayaan arena"
          referrerPolicy="no-referrer"
          onError={() => setBgLoaded(false)}
          className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center opacity-55"
        />
      )}

      {/* Contrast scrim keeping left menu legible while preserving right table glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#03150d]/95 via-[#03150d]/75 to-[#03150d]/35" />

      {/* Top Utility Bar */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 pt-3 sm:pt-4 safe-pt">
        <div className="flex items-center gap-3 text-xs sm:text-sm text-emerald-100/85">
          <label htmlFor="menu-player-name" className="sr-only">
            Nama Pemain
          </label>
          <input
            id="menu-player-name"
            type="text"
            maxLength={16}
            value={playerName}
            onChange={(e) => onChangePlayerName(e.target.value)}
            placeholder="Nama Pemain"
            className="w-36 sm:w-44 min-h-[44px] rounded-xl bg-black/50 border border-emerald-400/25 px-3 py-1.5 text-sm font-semibold text-white placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {matchHistory.length > 0 && (
            <span className="hidden sm:inline text-emerald-200/80 tabular-nums whitespace-nowrap">
              {wins} Menang · {matchHistory.length} Match
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleSound}
          aria-label={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
          className="min-w-[48px] min-h-[48px] px-3.5 rounded-xl bg-black/50 hover:bg-black/70 border border-white/15 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-white cursor-pointer transition-colors whitespace-nowrap shrink-0"
        >
          {soundEnabled ? (
            <Volume2 className="w-4.5 h-4.5 text-amber-300" />
          ) : (
            <VolumeX className="w-4.5 h-4.5 text-slate-400" />
          )}
          <span className="hidden sm:inline">
            {soundEnabled ? 'Suara Nyala' : 'Suara Mati'}
          </span>
        </button>
      </header>

      {/* Responsive Portrait (single column stack with hero card fan) & Landscape (2-column) Layout */}
      <main className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4 px-4 sm:px-8 lg:px-14 pb-4 safe-pb min-h-0 overflow-y-auto md:overflow-hidden">
        {/* Portrait Hero UNO Cards Stage (shown cleanly on portrait/mobile above actions, on right on landscape) */}
        <div className="flex md:hidden items-center justify-center h-[190px] sm:h-[220px] -my-2">
          <div className="scale-[0.72] sm:scale-[0.82] origin-center w-full">
            <UnoMenuHeroIllustration />
          </div>
        </div>

        {/* Left/Bottom Column: Brand + Four Primary Menu Buttons */}
        <div className="md:col-span-6 lg:col-span-6 flex flex-col items-center md:items-start text-center md:text-left justify-center max-w-xl mx-auto md:mx-0 w-full">
          <div className="mb-2 sm:mb-3">
            <MabarUnoLogo
              variant="horizontal"
              className="w-64 sm:w-80 lg:w-96 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]"
            />
          </div>

          <p className="text-xs sm:text-sm lg:text-base text-emerald-100/85 max-w-md mb-4 leading-relaxed">
            MABAR UNO (Main Bareng UNO) — Bermain solo melawan BOT cerdas atau
            seru-seruan bersama teman lewat Wi-Fi LAN &amp; Wi-Fi Direct tanpa
            internet.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-lg">
            <button
              type="button"
              onClick={onStartSinglePlayer}
              className="min-h-[54px] sm:min-h-[56px] px-4 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 border-b-4 border-amber-700 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-sm sm:text-base shadow-[0_10px_26px_rgba(251,191,36,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-transform whitespace-nowrap"
            >
              <Gamepad2 className="w-5 h-5 shrink-0" />
              <span>SINGLE PLAYER</span>
            </button>

            <button
              type="button"
              onClick={onOpenMultiplayer}
              className="min-h-[54px] sm:min-h-[56px] px-4 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 border-b-4 border-emerald-800 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-sm sm:text-base shadow-[0_10px_24px_rgba(16,185,129,0.28)] flex items-center justify-center gap-2 cursor-pointer transition-transform whitespace-nowrap"
            >
              <Users className="w-5 h-5 shrink-0" />
              <span>MULTIPLAYER</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5 sm:contents">
              <button
                type="button"
                onClick={onOpenSettings}
                className="min-h-[48px] sm:min-h-[50px] px-3 sm:px-4 rounded-2xl bg-black/55 hover:bg-black/75 border border-white/15 border-b-4 border-b-black/80 active:translate-y-0.5 text-white font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
              >
                <Settings className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>PENGATURAN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonTap();
                  setShowHowToPlay(true);
                }}
                className="min-h-[48px] sm:min-h-[50px] px-3 sm:px-4 rounded-2xl bg-black/55 hover:bg-black/75 border border-white/15 border-b-4 border-b-black/80 active:translate-y-0.5 text-white font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
                <span>CARA BERMAIN</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Tablet/Landscape): Pure UNO Card Arena Hero Illustration */}
        <div className="hidden md:flex md:col-span-6 lg:col-span-6 h-full items-center justify-center">
          <UnoMenuHeroIllustration />
        </div>
      </main>

      {showHowToPlay && (
        <HowToPlayModal
          onClose={() => {
            soundEngine.playButtonTap();
            setShowHowToPlay(false);
          }}
        />
      )}
    </div>
  );
};
