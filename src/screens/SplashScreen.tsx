import React, { useEffect } from 'react';
import { UnoArenaLogo } from '../components/UnoArenaLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 1100);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      onClick={onComplete}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onComplete();
        }
      }}
      className="relative w-full h-full flex flex-col items-center justify-center bg-radial from-[#0d4d31] via-[#062417] to-[#02100a] select-none cursor-pointer px-6"
    >
      <div className="flex flex-col items-center gap-4 animate-screen-enter">
        <UnoArenaLogo
          variant="horizontal"
          className="w-72 sm:w-96 h-auto drop-shadow-[0_14px_30px_rgba(0,0,0,0.6)]"
        />

        <p className="text-xs sm:text-sm font-medium text-emerald-200/85 tracking-wide">
          Arena Kartu UNO Offline &amp; Multiplayer Lokal
        </p>
      </div>
    </div>
  );
};
