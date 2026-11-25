import { BotDifficulty, CardColor, UnoCard } from '../engine/types';

export const BOT_PROFILES: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'Raka Bot', color: '#f59e0b' },
  { name: 'Sinta Bot', color: '#3b82f6' },
  { name: 'Dimas Bot', color: '#ef4444' },
  { name: 'Nadia Bot', color: '#a855f7' },
  { name: 'Bima Bot', color: '#06b6d4' },
  { name: 'Tari Bot', color: '#ec4899' },
  { name: 'Yoga Bot', color: '#84cc16' },
];

export const COLOR_LABELS_ID: Record<CardColor, string> = {
  red: 'Merah',
  yellow: 'Kuning',
  green: 'Hijau',
  blue: 'Biru',
};

export const COLOR_SWATCH_STYLES: Record<
  CardColor,
  { bg: string; border: string; text: string; ring: string }
> = {
  red: {
    bg: 'bg-red-600',
    border: 'border-red-400',
    text: 'text-red-400',
    ring: 'ring-red-400',
  },
  yellow: {
    bg: 'bg-amber-400',
    border: 'border-amber-300',
    text: 'text-amber-300',
    ring: 'ring-amber-300',
  },
  green: {
    bg: 'bg-emerald-600',
    border: 'border-emerald-400',
    text: 'text-emerald-400',
    ring: 'ring-emerald-400',
  },
  blue: {
    bg: 'bg-blue-600',
    border: 'border-blue-400',
    text: 'text-blue-400',
    ring: 'ring-blue-400',
  },
};

export const DIFFICULTY_LABELS_ID: Record<BotDifficulty, string> = {
  easy: 'Mudah',
  normal: 'Normal',
  hard: 'Sulit',
};

export function getCardLabel(card: UnoCard): string {
  const colorLabel =
    card.color === 'wild' ? 'Wild' : COLOR_LABELS_ID[card.color];

  switch (card.value) {
    case 'skip':
      return `${colorLabel} Skip`;
    case 'reverse':
      return `${colorLabel} Reverse`;
    case 'draw2':
      return `${colorLabel} +2`;
    case 'wild':
      return 'Wild Pilih Warna';
    case 'wild4':
      return 'Wild +4';
    default:
      return `${colorLabel} ${card.value}`;
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} dtk`;
  return `${mins} mnt ${secs} dtk`;
}
