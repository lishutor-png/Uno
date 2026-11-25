import React, { useId } from 'react';

interface UnoArenaLogoProps {
  variant?: 'horizontal' | 'icon';
  className?: string;
}

export const UnoArenaLogo: React.FC<UnoArenaLogoProps> = ({
  variant = 'horizontal',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');

  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 512 512"
        className={className}
        role="img"
        aria-label="Ikon UNO ARENA"
      >
        <defs>
          <radialGradient id={`${uid}_bg`} cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="55%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#021c12" />
          </radialGradient>
          <linearGradient id={`${uid}_gold`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id={`${uid}_text`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id={`${uid}_sh`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="10"
              floodColor="#000000"
              floodOpacity="0.55"
            />
          </filter>
        </defs>

        <rect
          x="16"
          y="16"
          width="480"
          height="480"
          rx="108"
          fill={`url(#${uid}_bg)`}
          stroke={`url(#${uid}_gold)`}
          strokeWidth="14"
        />
        <rect
          x="36"
          y="36"
          width="440"
          height="440"
          rx="92"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.15"
          strokeWidth="3"
        />

        <g filter={`url(#${uid}_sh)`}>
          <g transform="translate(175 185) rotate(-24)">
            <rect
              x="-52"
              y="-76"
              width="104"
              height="152"
              rx="16"
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="6"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="34"
              ry="50"
              transform="rotate(-14)"
              fill="#ffffff"
              fillOpacity="0.92"
            />
            <text
              x="0"
              y="14"
              textAnchor="middle"
              fontFamily="Outfit, sans-serif"
              fontWeight="900"
              fontSize="40"
              fill="#1d4ed8"
            >
              +2
            </text>
          </g>

          <g transform="translate(222 168) rotate(-8)">
            <rect
              x="-52"
              y="-76"
              width="104"
              height="152"
              rx="16"
              fill="#16a34a"
              stroke="#ffffff"
              strokeWidth="6"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="34"
              ry="50"
              transform="rotate(-14)"
              fill="#ffffff"
              fillOpacity="0.92"
            />
            <circle
              cx="0"
              cy="0"
              r="19"
              fill="none"
              stroke="#15803d"
              strokeWidth="7"
            />
            <line
              x1="-13"
              y1="13"
              x2="13"
              y2="-13"
              stroke="#15803d"
              strokeWidth="7"
            />
          </g>

          <g transform="translate(285 168) rotate(9)">
            <rect
              x="-52"
              y="-76"
              width="104"
              height="152"
              rx="16"
              fill="#eab308"
              stroke="#ffffff"
              strokeWidth="6"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="34"
              ry="50"
              transform="rotate(-14)"
              fill="#ffffff"
              fillOpacity="0.92"
            />
            <text
              x="0"
              y="18"
              textAnchor="middle"
              fontFamily="Outfit, sans-serif"
              fontWeight="900"
              fontSize="54"
              fill="#b45309"
            >
              7
            </text>
          </g>

          <g transform="translate(335 190) rotate(24)">
            <rect
              x="-52"
              y="-76"
              width="104"
              height="152"
              rx="16"
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth="6"
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
              fontFamily="Outfit, sans-serif"
              fontWeight="900"
              fontSize="32"
              fill="#dc2626"
            >
              UNO
            </text>
          </g>
        </g>

        <g transform="translate(256 356)" filter={`url(#${uid}_sh)`}>
          <rect
            x="-175"
            y="-64"
            width="350"
            height="114"
            rx="28"
            fill="#991b1b"
            stroke={`url(#${uid}_gold)`}
            strokeWidth="7"
            transform="rotate(-3)"
          />
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
            fontWeight="900"
            fontSize="76"
            letterSpacing="3"
            fill={`url(#${uid}_text)`}
            stroke="#0f172a"
            strokeWidth="11"
            paintOrder="stroke"
            transform="rotate(-3)"
          >
            UNO
          </text>
          <text
            x="0"
            y="42"
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
            fontWeight="800"
            fontSize="28"
            letterSpacing="10"
            fill="#fef08a"
            stroke="#0f172a"
            strokeWidth="5"
            paintOrder="stroke"
          >
            ARENA
          </text>
        </g>
      </svg>
    );
  }

  // Horizontal Master Brand Lockup
  return (
    <svg
      viewBox="0 0 540 160"
      className={className}
      role="img"
      aria-label="UNO ARENA"
    >
      <defs>
        <linearGradient id={`${uid}_red3d`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="55%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id={`${uid}_gold3d`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="45%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={`${uid}_arena3d`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <filter id={`${uid}_drop`} x="-15%" y="-20%" width="135%" height="145%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="7"
            floodColor="#000000"
            floodOpacity="0.6"
          />
        </filter>
      </defs>

      {/* Left Symbol: 4-Color Stacked UNO Cards */}
      <g transform="translate(86 84)" filter={`url(#${uid}_drop)`}>
        <g transform="translate(-32 8) rotate(-22)">
          <rect
            x="-24"
            y="-36"
            width="48"
            height="72"
            rx="8"
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth="3"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="16"
            ry="24"
            transform="rotate(-14)"
            fill="#ffffff"
            fillOpacity="0.92"
          />
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
            fontWeight="900"
            fontSize="18"
            fill="#1d4ed8"
          >
            +2
          </text>
        </g>

        <g transform="translate(-10 -2) rotate(-7)">
          <rect
            x="-24"
            y="-36"
            width="48"
            height="72"
            rx="8"
            fill="#16a34a"
            stroke="#ffffff"
            strokeWidth="3"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="16"
            ry="24"
            transform="rotate(-14)"
            fill="#ffffff"
            fillOpacity="0.92"
          />
          <circle
            cx="0"
            cy="0"
            r="9"
            fill="none"
            stroke="#15803d"
            strokeWidth="3.5"
          />
          <line
            x1="-6"
            y1="6"
            x2="6"
            y2="-6"
            stroke="#15803d"
            strokeWidth="3.5"
          />
        </g>

        <g transform="translate(14 -2) rotate(8)">
          <rect
            x="-24"
            y="-36"
            width="48"
            height="72"
            rx="8"
            fill="#eab308"
            stroke="#ffffff"
            strokeWidth="3"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="16"
            ry="24"
            transform="rotate(-14)"
            fill="#ffffff"
            fillOpacity="0.92"
          />
          <text
            x="0"
            y="8"
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
            fontWeight="900"
            fontSize="24"
            fill="#b45309"
          >
            7
          </text>
        </g>

        <g transform="translate(34 10) rotate(21)">
          <rect
            x="-24"
            y="-36"
            width="48"
            height="72"
            rx="8"
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth="3"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="16"
            ry="24"
            transform="rotate(-14)"
            fill="#ffffff"
            fillOpacity="0.96"
          />
          <text
            x="0"
            y="7"
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
            fontWeight="900"
            fontSize="19"
            fill="#dc2626"
          >
            9
          </text>
        </g>
      </g>

      {/* Right Wordmark: 3D Embossed UNO + ARENA */}
      <g transform="translate(168 24)" filter={`url(#${uid}_drop)`}>
        {/* Angled Crimson-Gold UNO Plate */}
        <g transform="translate(0 4) rotate(-3)">
          {/* 3D Extrude Shadow Layer */}
          <rect
            x="3"
            y="7"
            width="196"
            height="76"
            rx="22"
            fill="#450a0a"
          />
          <rect
            x="0"
            y="0"
            width="196"
            height="76"
            rx="22"
            fill={`url(#${uid}_red3d)`}
            stroke={`url(#${uid}_gold3d)`}
            strokeWidth="4.5"
          />
          {/* Top glossy bevel highlight */}
          <path
            d="M 22 6 H 174 C 184 6 188 12 188 22 V 28 C 145 20 55 20 8 28 V 22 C 8 12 12 6 22 6 Z"
            fill="#ffffff"
            fillOpacity="0.16"
          />
          {/* 3D Text Extrude */}
          <text
            x="101"
            y="59"
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
            fontWeight="900"
            fontSize="58"
            letterSpacing="3"
            fill="#020617"
          >
            UNO
          </text>
          <text
            x="98"
            y="54"
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
            fontWeight="900"
            fontSize="58"
            letterSpacing="3"
            fill={`url(#${uid}_gold3d)`}
            stroke="#0f172a"
            strokeWidth="7"
            paintOrder="stroke"
          >
            UNO
          </text>
        </g>

        {/* Bold ARENA Typography with 4-color accent bar */}
        <g transform="translate(8 96)">
          <rect x="2" y="2" width="38" height="5" rx="2.5" fill="#dc2626" />
          <rect x="44" y="2" width="38" height="5" rx="2.5" fill="#eab308" />
          <rect x="86" y="2" width="38" height="5" rx="2.5" fill="#16a34a" />
          <rect x="128" y="2" width="38" height="5" rx="2.5" fill="#2563eb" />

          {/* Extruded ARENA Shadow */}
          <text
            x="179"
            y="6"
            fontFamily="Outfit, sans-serif"
            fontWeight="900"
            fontSize="38"
            letterSpacing="6"
            fill="#020617"
          >
            ARENA
          </text>
          <text
            x="176"
            y="3"
            fontFamily="Outfit, sans-serif"
            fontWeight="900"
            fontSize="38"
            letterSpacing="6"
            fill={`url(#${uid}_arena3d)`}
            stroke="#0f172a"
            strokeWidth="5"
            paintOrder="stroke"
          >
            ARENA
          </text>
        </g>
      </g>
    </svg>
  );
};
