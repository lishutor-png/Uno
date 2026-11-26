import React from 'react';

interface MabarUnoLogoProps {
  variant?: 'horizontal' | 'icon';
  className?: string;
}

/**
 * High-contrast, multi-layered 3D vector logo for MABAR UNO (Main Bareng UNO).
 * Built with pure SVG so it remains razor-sharp at any resolution from small
 * Android launcher icons to large splash screens and lobby headers.
 */
export const MabarUnoLogo: React.FC<MabarUnoLogoProps> = ({
  variant = 'horizontal',
  className = '',
}) => {
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 512 512"
        className={className}
        role="img"
        aria-label="Ikon MABAR UNO"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="mabarIconBg" cx="50%" cy="38%" r="68%">
            <stop offset="0%" stopColor="#198754" />
            <stop offset="56%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#021910" />
          </radialGradient>
          <linearGradient id="mabarGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="48%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="mabarWhiteGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="68%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
          <linearGradient id="mabarBadgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="55%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>
          <filter id="mabarIconShadow" x="-20%" y="-20%" width="140%" height="145%">
            <feDropShadow
              dx="0"
              dy="12"
              stdDeviation="11"
              floodColor="#000000"
              floodOpacity="0.6"
            />
          </filter>
        </defs>

        {/* Rounded Square App Icon Base */}
        <rect
          x="16"
          y="16"
          width="480"
          height="480"
          rx="112"
          fill="url(#mabarIconBg)"
          stroke="url(#mabarGold)"
          strokeWidth="14"
        />
        <rect
          x="38"
          y="38"
          width="436"
          height="436"
          rx="92"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.16"
          strokeWidth="3"
        />

        {/* Arena Spotlight */}
        <ellipse cx="256" cy="180" rx="176" ry="110" fill="#34d399" fillOpacity="0.16" />

        {/* Four-Color Stacked UNO Cards */}
        <g filter="url(#mabarIconShadow)">
          <g transform="translate(152 178) rotate(-26)">
            <rect
              x="-52"
              y="-76"
              width="104"
              height="152"
              rx="18"
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="7"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="34"
              ry="50"
              transform="rotate(-14)"
              fill="#ffffff"
              fillOpacity="0.95"
            />
            <text
              x="0"
              y="14"
              textAnchor="middle"
              fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
              fontWeight="900"
              fontSize="40"
              fill="#1d4ed8"
            >
              +2
            </text>
          </g>

          <g transform="translate(216 154) rotate(-9)">
            <rect
              x="-52"
              y="-76"
              width="104"
              height="152"
              rx="18"
              fill="#16a34a"
              stroke="#ffffff"
              strokeWidth="7"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="34"
              ry="50"
              transform="rotate(-14)"
              fill="#ffffff"
              fillOpacity="0.95"
            />
            <circle cx="0" cy="0" r="20" fill="none" stroke="#15803d" strokeWidth="7.5" />
            <line x1="-14" y1="14" x2="14" y2="-14" stroke="#15803d" strokeWidth="7.5" />
          </g>

          <g transform="translate(290 154) rotate(9)">
            <rect
              x="-52"
              y="-76"
              width="104"
              height="152"
              rx="18"
              fill="#eab308"
              stroke="#ffffff"
              strokeWidth="7"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="34"
              ry="50"
              transform="rotate(-14)"
              fill="#ffffff"
              fillOpacity="0.95"
            />
            <text
              x="0"
              y="18"
              textAnchor="middle"
              fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
              fontWeight="900"
              fontSize="54"
              fill="#b45309"
            >
              7
            </text>
          </g>

          <g transform="translate(358 178) rotate(26)">
            <rect
              x="-52"
              y="-76"
              width="104"
              height="152"
              rx="18"
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth="7"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="34"
              ry="50"
              transform="rotate(-14)"
              fill="#ffffff"
              fillOpacity="0.96"
            />
            <text
              x="0"
              y="16"
              textAnchor="middle"
              fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
              fontWeight="900"
              fontSize="44"
              fill="#dc2626"
            >
              +4
            </text>
          </g>
        </g>

        {/* Bold 3D Emblem Crest — High Legibility even at Small Sizes */}
        <g transform="translate(256 346)" filter="url(#mabarIconShadow)">
          <rect
            x="-204"
            y="-82"
            width="408"
            height="162"
            rx="36"
            fill="url(#mabarBadgeBg)"
            stroke="url(#mabarGold)"
            strokeWidth="8"
            transform="rotate(-3)"
          />
          <rect
            x="-192"
            y="-70"
            width="384"
            height="138"
            rx="28"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.22"
            strokeWidth="2.5"
            transform="rotate(-3)"
          />

          {/* Top 4-Color Ribbon Accent */}
          <g transform="translate(-128 -68) rotate(-3)">
            <rect x="0" y="0" width="60" height="8" rx="4" fill="#ef4444" />
            <rect x="65" y="0" width="60" height="8" rx="4" fill="#facc15" />
            <rect x="130" y="0" width="60" height="8" rx="4" fill="#22c55e" />
            <rect x="195" y="0" width="60" height="8" rx="4" fill="#3b82f6" />
          </g>

          {/* MABAR 3D Text */}
          <text
            x="0"
            y="-4"
            textAnchor="middle"
            fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
            fontWeight="900"
            fontSize="66"
            letterSpacing="4"
            fill="#090d16"
            stroke="#090d16"
            strokeWidth="12"
            paintOrder="stroke"
            transform="translate(0 5) rotate(-3)"
          >
            MABAR
          </text>
          <text
            x="0"
            y="-4"
            textAnchor="middle"
            fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
            fontWeight="900"
            fontSize="66"
            letterSpacing="4"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="10"
            paintOrder="stroke"
            transform="rotate(-3)"
          >
            MABAR
          </text>

          {/* UNO 3D Gold Extruded Text */}
          <text
            x="0"
            y="62"
            textAnchor="middle"
            fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
            fontWeight="900"
            fontSize="72"
            letterSpacing="7"
            fill="#450a0a"
            stroke="#090d16"
            strokeWidth="14"
            paintOrder="stroke"
            transform="translate(0 6) rotate(-3)"
          >
            UNO
          </text>
          <text
            x="0"
            y="62"
            textAnchor="middle"
            fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
            fontWeight="900"
            fontSize="72"
            letterSpacing="7"
            fill="url(#mabarWhiteGold)"
            stroke="#0f172a"
            strokeWidth="11"
            paintOrder="stroke"
            transform="rotate(-3)"
          >
            UNO
          </text>
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 640 220"
      className={className}
      role="img"
      aria-label="MABAR UNO — Main Bareng UNO"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mabarHorizGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="mabarHorizWhite" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="mabarHorizUno" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id="mabarCrestFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b91c1c" />
          <stop offset="60%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>
        <filter id="mabarHorizShadow" x="-15%" y="-20%" width="135%" height="150%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="7"
            floodColor="#000000"
            floodOpacity="0.58"
          />
        </filter>
      </defs>

      {/* Ambient Emerald Glow Behind Cards */}
      <ellipse cx="122" cy="112" rx="95" ry="74" fill="#34d399" fillOpacity="0.22" />

      {/* Left Emblem: Stacked 4-Color UNO Card Fan */}
      <g filter="url(#mabarHorizShadow)" transform="translate(114 114)">
        {/* Blue +2 */}
        <g transform="translate(-44 6) rotate(-24)">
          <rect
            x="-32"
            y="-48"
            width="64"
            height="96"
            rx="12"
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth="4.5"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="21"
            ry="32"
            transform="rotate(-14)"
            fill="#ffffff"
            fillOpacity="0.94"
          />
          <text
            x="0"
            y="10"
            textAnchor="middle"
            fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
            fontWeight="900"
            fontSize="24"
            fill="#1d4ed8"
          >
            +2
          </text>
        </g>

        {/* Green Skip */}
        <g transform="translate(-14 -8) rotate(-8)">
          <rect
            x="-32"
            y="-48"
            width="64"
            height="96"
            rx="12"
            fill="#16a34a"
            stroke="#ffffff"
            strokeWidth="4.5"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="21"
            ry="32"
            transform="rotate(-14)"
            fill="#ffffff"
            fillOpacity="0.94"
          />
          <circle cx="0" cy="0" r="12" fill="none" stroke="#15803d" strokeWidth="4.5" />
          <line x1="-8.5" y1="8.5" x2="8.5" y2="-8.5" stroke="#15803d" strokeWidth="4.5" />
        </g>

        {/* Yellow Reverse */}
        <g transform="translate(20 -6) rotate(9)">
          <rect
            x="-32"
            y="-48"
            width="64"
            height="96"
            rx="12"
            fill="#eab308"
            stroke="#ffffff"
            strokeWidth="4.5"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="21"
            ry="32"
            transform="rotate(-14)"
            fill="#ffffff"
            fillOpacity="0.95"
          />
          <text
            x="0"
            y="11"
            textAnchor="middle"
            fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
            fontWeight="900"
            fontSize="32"
            fill="#b45309"
          >
            7
          </text>
        </g>

        {/* Red Front Card */}
        <g transform="translate(48 10) rotate(22)">
          <rect
            x="-34"
            y="-50"
            width="68"
            height="100"
            rx="12"
            fill="#dc2626"
            stroke="url(#mabarHorizGold)"
            strokeWidth="4.5"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="22"
            ry="33"
            transform="rotate(-14)"
            fill="#ffffff"
            fillOpacity="0.96"
          />
          <text
            x="0"
            y="10"
            textAnchor="middle"
            fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
            fontWeight="900"
            fontSize="24"
            fill="#dc2626"
          >
            UNO
          </text>
        </g>
      </g>

      {/* Right Wordmark Composition */}
      <g filter="url(#mabarHorizShadow)" transform="translate(204 0)">
        {/* Crest Backing Plate */}
        <rect
          x="10"
          y="26"
          width="408"
          height="148"
          rx="28"
          fill="url(#mabarCrestFill)"
          fillOpacity="0.92"
          stroke="url(#mabarHorizGold)"
          strokeWidth="5"
          transform="rotate(-1.8 214 100)"
        />

        {/* 4-Color Accent Bar Inside Top Edge */}
        <g transform="translate(48 36) rotate(-1.8)">
          <rect x="0" y="0" width="78" height="7" rx="3.5" fill="#ef4444" />
          <rect x="84" y="0" width="78" height="7" rx="3.5" fill="#facc15" />
          <rect x="168" y="0" width="78" height="7" rx="3.5" fill="#22c55e" />
          <rect x="252" y="0" width="78" height="7" rx="3.5" fill="#3b82f6" />
        </g>

        {/* MABAR 3D Wordmark */}
        <text
          x="214"
          y="96"
          textAnchor="middle"
          fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
          fontWeight="900"
          fontSize="58"
          letterSpacing="5"
          fill="#090d16"
          stroke="#090d16"
          strokeWidth="12"
          paintOrder="stroke"
          transform="translate(0 5) rotate(-1.8 214 96)"
        >
          MABAR
        </text>
        <text
          x="214"
          y="96"
          textAnchor="middle"
          fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
          fontWeight="900"
          fontSize="58"
          letterSpacing="5"
          fill="url(#mabarHorizWhite)"
          stroke="#0f172a"
          strokeWidth="9"
          paintOrder="stroke"
          transform="rotate(-1.8 214 96)"
        >
          MABAR
        </text>

        {/* UNO 3D Bold Wordmark */}
        <text
          x="214"
          y="156"
          textAnchor="middle"
          fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
          fontWeight="900"
          fontSize="66"
          letterSpacing="12"
          fill="#090d16"
          stroke="#090d16"
          strokeWidth="13"
          paintOrder="stroke"
          transform="translate(0 5) rotate(-1.8 214 156)"
        >
          UNO
        </text>
        <text
          x="214"
          y="156"
          textAnchor="middle"
          fontFamily="Outfit, DejaVu Sans, Arial Black, sans-serif"
          fontWeight="900"
          fontSize="66"
          letterSpacing="12"
          fill="url(#mabarHorizUno)"
          stroke="#0f172a"
          strokeWidth="10"
          paintOrder="stroke"
          transform="rotate(-1.8 214 156)"
        >
          UNO
        </text>

        {/* Bottom Subtitle Pill: MAIN BARENG UNO */}
        <rect
          x="96"
          y="174"
          width="236"
          height="32"
          rx="16"
          fill="#052e1c"
          stroke="url(#mabarHorizGold)"
          strokeWidth="2.5"
        />
        <text
          x="214"
          y="195"
          textAnchor="middle"
          fontFamily="Outfit, DejaVu Sans, sans-serif"
          fontWeight="800"
          fontSize="15"
          letterSpacing="4"
          fill="#fef08a"
        >
          MAIN BARENG UNO
        </text>
      </g>
    </svg>
  );
};
