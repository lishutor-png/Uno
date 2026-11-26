import React, { useEffect } from 'react';
import { MabarUnoLogo } from '../components/MabarUnoLogo';

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
        <MabarUnoLogo
          variant="horizontal"
          className="w-72 sm:w-[420px] h-auto drop-shadow-[0_14px_30px_rgba(0,0,0,0.65)]"
        />

        <p className="text-xs sm:text-sm font-semibold text-emerald-200/90 tracking-wide">
          Main Bareng UNO · Offline &amp; Multiplayer Lokal
        </p>
      </div>
    </div>
  );
};
