import React, { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { TargetOrientation } from '../utilities/orientationManager';

interface LandscapeGuardProps {
  requiredOrientation: TargetOrientation;
}

/**
 * Only prompts portrait mobile users to rotate when the current mode explicitly
 * requires landscape (e.g., 5-8 player multiplayer or explicit landscape lock).
 * Main menu, Single Player, and 2-4 player multiplayer never trigger this prompt.
 */
export const LandscapeGuard: React.FC<LandscapeGuardProps> = ({
  requiredOrientation,
}) => {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const narrowPhone = window.innerWidth < 580;
      setIsPortraitMobile(portrait && narrowPhone);
      if (!portrait) {
        setDismissed(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  if (requiredOrientation !== 'landscape' || !isPortraitMobile || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#03140c]/95 p-6 text-center">
      <div className="max-w-xs rounded-2xl bg-[#09281a] border border-emerald-400/25 p-6 shadow-2xl space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-300/35 flex items-center justify-center text-amber-300">
          <RotateCw className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-white mb-1">
            Putar ke Mode Landscape
          </h2>
          <p className="text-xs text-emerald-100/80 leading-relaxed">
            Mode Multiplayer 5–8 pemain lebih nyaman dimainkan dalam orientasi
            mendatar (landscape) agar seluruh kursi pemain terlihat jelas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-full min-h-[48px] rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
        >
          Lanjutkan Tetap Portrait
        </button>
      </div>
    </div>
  );
};
