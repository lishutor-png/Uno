import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const ROOT = process.cwd();
const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const ICON_SVG = fs.readFileSync(path.join(ROOT, 'public', 'icon.svg'), 'utf8');

function buildRoundIconSvg() {
  // Replace outer rounded rect with circular clip for ic_launcher_round.png
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="roundClip">
      <circle cx="256" cy="256" r="244" />
    </clipPath>
    <radialGradient id="mabarIconBg" cx="50%" cy="38%" r="68%">
      <stop offset="0%" stop-color="#198754" />
      <stop offset="56%" stop-color="#064e3b" />
      <stop offset="100%" stop-color="#021910" />
    </radialGradient>
    <linearGradient id="mabarGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="48%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="mabarWhiteGold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="68%" stop-color="#fef9c3" />
      <stop offset="100%" stop-color="#facc15" />
    </linearGradient>
    <linearGradient id="mabarBadgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b91c1c" />
      <stop offset="55%" stop-color="#991b1b" />
      <stop offset="100%" stop-color="#450a0a" />
    </linearGradient>
    <filter id="mabarIconShadow" x="-20%" y="-20%" width="140%" height="145%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <g clip-path="url(#roundClip)">
    <rect x="0" y="0" width="512" height="512" fill="url(#mabarIconBg)" />
    <ellipse cx="256" cy="180" rx="176" ry="110" fill="#34d399" fill-opacity="0.18" />

    <g filter="url(#mabarIconShadow)" transform="translate(256 256) scale(0.92) translate(-256 -256)">
      <g transform="translate(152 178) rotate(-26)">
        <rect x="-52" y="-76" width="104" height="152" rx="18" fill="#2563eb" stroke="#ffffff" stroke-width="7" />
        <ellipse cx="0" cy="0" rx="34" ry="50" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.95" />
        <text x="0" y="14" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="38" fill="#1d4ed8">+2</text>
      </g>
      <g transform="translate(216 154) rotate(-9)">
        <rect x="-52" y="-76" width="104" height="152" rx="18" fill="#16a34a" stroke="#ffffff" stroke-width="7" />
        <ellipse cx="0" cy="0" rx="34" ry="50" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.95" />
        <circle cx="0" cy="0" r="20" fill="none" stroke="#15803d" stroke-width="7.5" />
        <line x1="-14" y1="14" x2="14" y2="-14" stroke="#15803d" stroke-width="7.5" />
      </g>
      <g transform="translate(290 154) rotate(9)">
        <rect x="-52" y="-76" width="104" height="152" rx="18" fill="#eab308" stroke="#ffffff" stroke-width="7" />
        <ellipse cx="0" cy="0" rx="34" ry="50" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.95" />
        <text x="0" y="18" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="52" fill="#b45309">7</text>
      </g>
      <g transform="translate(358 178) rotate(26)">
        <rect x="-52" y="-76" width="104" height="152" rx="18" fill="#dc2626" stroke="#ffffff" stroke-width="7" />
        <ellipse cx="0" cy="0" rx="34" ry="50" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.96" />
        <text x="0" y="16" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="40" fill="#dc2626">+4</text>
      </g>

      <g transform="translate(256 346)">
        <rect x="-200" y="-82" width="400" height="162" rx="36" fill="url(#mabarBadgeBg)" stroke="url(#mabarGold)" stroke-width="8" transform="rotate(-3)" />
        <g transform="translate(-128 -68) rotate(-3)">
          <rect x="0" y="0" width="60" height="8" rx="4" fill="#ef4444" />
          <rect x="65" y="0" width="60" height="8" rx="4" fill="#facc15" />
          <rect x="130" y="0" width="60" height="8" rx="4" fill="#22c55e" />
          <rect x="195" y="0" width="60" height="8" rx="4" fill="#3b82f6" />
        </g>
        <text x="0" y="-4" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="62" letter-spacing="3" fill="#090d16" stroke="#090d16" stroke-width="12" paint-order="stroke" transform="translate(0 5) rotate(-3)">MABAR</text>
        <text x="0" y="-4" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="62" letter-spacing="3" fill="#ffffff" stroke="#0f172a" stroke-width="10" paint-order="stroke" transform="rotate(-3)">MABAR</text>
        <text x="0" y="62" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="68" letter-spacing="6" fill="#450a0a" stroke="#090d16" stroke-width="14" paint-order="stroke" transform="translate(0 6) rotate(-3)">UNO</text>
        <text x="0" y="62" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="68" letter-spacing="6" fill="url(#mabarWhiteGold)" stroke="#0f172a" stroke-width="11" paint-order="stroke" transform="rotate(-3)">UNO</text>
      </g>
    </g>
  </g>
  <circle cx="256" cy="256" r="242" fill="none" stroke="url(#mabarGold)" stroke-width="14" />
</svg>`;
}

function buildAdaptiveForegroundSvg() {
  // 108dp adaptive grid: inner 66% (safe zone) holds crisp cards + MABAR UNO emblem
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="mabarGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="48%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="mabarWhiteGold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="68%" stop-color="#fef9c3" />
      <stop offset="100%" stop-color="#facc15" />
    </linearGradient>
    <linearGradient id="mabarBadgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b91c1c" />
      <stop offset="55%" stop-color="#991b1b" />
      <stop offset="100%" stop-color="#450a0a" />
    </linearGradient>
    <filter id="mabarIconShadow" x="-20%" y="-20%" width="140%" height="145%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000000" flood-opacity="0.65" />
    </filter>
  </defs>

  <g filter="url(#mabarIconShadow)" transform="translate(256 256) scale(0.66) translate(-256 -256)">
    <g transform="translate(152 178) rotate(-26)">
      <rect x="-52" y="-76" width="104" height="152" rx="18" fill="#2563eb" stroke="#ffffff" stroke-width="7" />
      <ellipse cx="0" cy="0" rx="34" ry="50" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.95" />
      <text x="0" y="14" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="38" fill="#1d4ed8">+2</text>
    </g>
    <g transform="translate(216 154) rotate(-9)">
      <rect x="-52" y="-76" width="104" height="152" rx="18" fill="#16a34a" stroke="#ffffff" stroke-width="7" />
      <ellipse cx="0" cy="0" rx="34" ry="50" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.95" />
      <circle cx="0" cy="0" r="20" fill="none" stroke="#15803d" stroke-width="7.5" />
      <line x1="-14" y1="14" x2="14" y2="-14" stroke="#15803d" stroke-width="7.5" />
    </g>
    <g transform="translate(290 154) rotate(9)">
      <rect x="-52" y="-76" width="104" height="152" rx="18" fill="#eab308" stroke="#ffffff" stroke-width="7" />
      <ellipse cx="0" cy="0" rx="34" ry="50" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.95" />
      <text x="0" y="18" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="52" fill="#b45309">7</text>
    </g>
    <g transform="translate(358 178) rotate(26)">
      <rect x="-52" y="-76" width="104" height="152" rx="18" fill="#dc2626" stroke="#ffffff" stroke-width="7" />
      <ellipse cx="0" cy="0" rx="34" ry="50" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.96" />
      <text x="0" y="16" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="40" fill="#dc2626">+4</text>
    </g>

    <g transform="translate(256 346)">
      <rect x="-204" y="-82" width="408" height="162" rx="36" fill="url(#mabarBadgeBg)" stroke="url(#mabarGold)" stroke-width="8" transform="rotate(-3)" />
      <g transform="translate(-128 -68) rotate(-3)">
        <rect x="0" y="0" width="60" height="8" rx="4" fill="#ef4444" />
        <rect x="65" y="0" width="60" height="8" rx="4" fill="#facc15" />
        <rect x="130" y="0" width="60" height="8" rx="4" fill="#22c55e" />
        <rect x="195" y="0" width="60" height="8" rx="4" fill="#3b82f6" />
      </g>
      <text x="0" y="-4" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="62" letter-spacing="3" fill="#090d16" stroke="#090d16" stroke-width="12" paint-order="stroke" transform="translate(0 5) rotate(-3)">MABAR</text>
      <text x="0" y="-4" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="62" letter-spacing="3" fill="#ffffff" stroke="#0f172a" stroke-width="10" paint-order="stroke" transform="rotate(-3)">MABAR</text>
      <text x="0" y="62" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="68" letter-spacing="6" fill="#450a0a" stroke="#090d16" stroke-width="14" paint-order="stroke" transform="translate(0 6) rotate(-3)">UNO</text>
      <text x="0" y="62" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="68" letter-spacing="6" fill="url(#mabarWhiteGold)" stroke="#0f172a" stroke-width="11" paint-order="stroke" transform="rotate(-3)">UNO</text>
    </g>
  </g>
</svg>`;
}

const HORIZONTAL_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" width="1280" height="440">
  <defs>
    <linearGradient id="mabarHorizGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef9c3" />
      <stop offset="45%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="mabarHorizWhite" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <linearGradient id="mabarHorizUno" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
    <linearGradient id="mabarCrestFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b91c1c" />
      <stop offset="60%" stop-color="#7f1d1d" />
      <stop offset="100%" stop-color="#450a0a" />
    </linearGradient>
    <filter id="mabarHorizShadow" x="-15%" y="-20%" width="135%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000000" flood-opacity="0.58" />
    </filter>
  </defs>

  <ellipse cx="122" cy="112" rx="95" ry="74" fill="#34d399" fill-opacity="0.22" />

  <g filter="url(#mabarHorizShadow)" transform="translate(114 114)">
    <g transform="translate(-44 6) rotate(-24)">
      <rect x="-32" y="-48" width="64" height="96" rx="12" fill="#2563eb" stroke="#ffffff" stroke-width="4.5" />
      <ellipse cx="0" cy="0" rx="21" ry="32" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.94" />
      <text x="0" y="10" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="22" fill="#1d4ed8">+2</text>
    </g>
    <g transform="translate(-14 -8) rotate(-8)">
      <rect x="-32" y="-48" width="64" height="96" rx="12" fill="#16a34a" stroke="#ffffff" stroke-width="4.5" />
      <ellipse cx="0" cy="0" rx="21" ry="32" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.94" />
      <circle cx="0" cy="0" r="12" fill="none" stroke="#15803d" stroke-width="4.5" />
      <line x1="-8.5" y1="8.5" x2="8.5" y2="-8.5" stroke="#15803d" stroke-width="4.5" />
    </g>
    <g transform="translate(20 -6) rotate(9)">
      <rect x="-32" y="-48" width="64" height="96" rx="12" fill="#eab308" stroke="#ffffff" stroke-width="4.5" />
      <ellipse cx="0" cy="0" rx="21" ry="32" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.95" />
      <text x="0" y="11" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="30" fill="#b45309">7</text>
    </g>
    <g transform="translate(48 10) rotate(22)">
      <rect x="-34" y="-50" width="68" height="100" rx="12" fill="#dc2626" stroke="url(#mabarHorizGold)" stroke-width="4.5" />
      <ellipse cx="0" cy="0" rx="22" ry="33" transform="rotate(-14)" fill="#ffffff" fill-opacity="0.96" />
      <text x="0" y="10" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="22" fill="#dc2626">UNO</text>
    </g>
  </g>

  <g filter="url(#mabarHorizShadow)" transform="translate(204 0)">
    <rect x="10" y="26" width="408" height="148" rx="28" fill="url(#mabarCrestFill)" fill-opacity="0.94" stroke="url(#mabarHorizGold)" stroke-width="5" transform="rotate(-1.8 214 100)" />
    <g transform="translate(48 36) rotate(-1.8)">
      <rect x="0" y="0" width="78" height="7" rx="3.5" fill="#ef4444" />
      <rect x="84" y="0" width="78" height="7" rx="3.5" fill="#facc15" />
      <rect x="168" y="0" width="78" height="7" rx="3.5" fill="#22c55e" />
      <rect x="252" y="0" width="78" height="7" rx="3.5" fill="#3b82f6" />
    </g>
    <text x="214" y="96" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="54" letter-spacing="4" fill="#090d16" stroke="#090d16" stroke-width="12" paint-order="stroke" transform="translate(0 5) rotate(-1.8 214 96)">MABAR</text>
    <text x="214" y="96" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="54" letter-spacing="4" fill="url(#mabarHorizWhite)" stroke="#0f172a" stroke-width="9" paint-order="stroke" transform="rotate(-1.8 214 96)">MABAR</text>
    <text x="214" y="156" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="62" letter-spacing="10" fill="#090d16" stroke="#090d16" stroke-width="13" paint-order="stroke" transform="translate(0 5) rotate(-1.8 214 156)">UNO</text>
    <text x="214" y="156" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="62" letter-spacing="10" fill="url(#mabarHorizUno)" stroke="#0f172a" stroke-width="10" paint-order="stroke" transform="rotate(-1.8 214 156)">UNO</text>
    <rect x="96" y="174" width="236" height="32" rx="16" fill="#052e1c" stroke="url(#mabarHorizGold)" stroke-width="2.5" />
    <text x="214" y="195" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="14" letter-spacing="3.5" fill="#fef08a">MAIN BARENG UNO</text>
  </g>
</svg>`;

function buildSplashSvg(width, height) {
  const minDim = Math.min(width, height);
  const logoW = Math.round(minDim * 0.78);
  const logoH = Math.round(logoW * (220 / 640));
  const x = Math.round((width - logoW) / 2);
  const y = Math.round((height - logoH) / 2);
  const innerHoriz = HORIZONTAL_LOGO_SVG.replace(
    /<svg[^>]*>/,
    ''
  ).replace(/<\/svg>\s*$/, '');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <radialGradient id="splashBg" cx="50%" cy="44%" r="72%">
      <stop offset="0%" stop-color="#0f5c39" />
      <stop offset="55%" stop-color="#062819" />
      <stop offset="100%" stop-color="#02100a" />
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#splashBg)" />
  <svg x="${x}" y="${y}" width="${logoW}" height="${logoH}" viewBox="0 0 640 220">
    ${innerHoriz}
  </svg>
</svg>`;
}

function renderSvgToPng(svg, width, outPath) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      fontFiles: [FONT_PATH],
      loadSystemFonts: false,
      defaultFontFamily: 'DejaVu Sans',
    },
  });
  const pngBuffer = resvg.render().asPng();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, pngBuffer);
}

// 1. Public web PNG logo & icon
renderSvgToPng(ICON_SVG, 1024, path.join(ROOT, 'public', 'mabar-uno-icon.png'));
renderSvgToPng(HORIZONTAL_LOGO_SVG, 1280, path.join(ROOT, 'public', 'mabar-uno-logo.png'));

// 2. Android mipmap launcher icons
const ROUND_SVG = buildRoundIconSvg();
const FOREGROUND_SVG = buildAdaptiveForegroundSvg();

const mipmaps = [
  { dir: 'mipmap-mdpi', icon: 48, fg: 108 },
  { dir: 'mipmap-hdpi', icon: 72, fg: 162 },
  { dir: 'mipmap-xhdpi', icon: 96, fg: 216 },
  { dir: 'mipmap-xxhdpi', icon: 144, fg: 324 },
  { dir: 'mipmap-xxxhdpi', icon: 192, fg: 432 },
];

for (const m of mipmaps) {
  const baseDir = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', m.dir);
  renderSvgToPng(ICON_SVG, m.icon, path.join(baseDir, 'ic_launcher.png'));
  renderSvgToPng(ROUND_SVG, m.icon, path.join(baseDir, 'ic_launcher_round.png'));
  renderSvgToPng(FOREGROUND_SVG, m.fg, path.join(baseDir, 'ic_launcher_foreground.png'));
}

// 3. Android Splash PNGs
const splashes = [
  { dir: 'drawable', w: 480, h: 320 },
  { dir: 'drawable-land-mdpi', w: 480, h: 320 },
  { dir: 'drawable-land-hdpi', w: 800, h: 480 },
  { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
  { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
  { dir: 'drawable-port-mdpi', w: 320, h: 480 },
  { dir: 'drawable-port-hdpi', w: 480, h: 800 },
  { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
  { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
];

for (const sp of splashes) {
  const outPath = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', sp.dir, 'splash.png');
  renderSvgToPng(buildSplashSvg(sp.w, sp.h), sp.w, outPath);
}

console.log('Generated MABAR UNO PNG assets and Android icons/splashes successfully.');
