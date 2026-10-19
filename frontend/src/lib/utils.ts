import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { formatUnits } from 'viem';
import { USDT_DECIMALS } from './constants';
import { intlLocales } from '@/i18n/intlLocales';
import type { Language } from '@/i18n/translations';

// tailwind-merge does not read styles/theme.css: it takes the theme's own type sizes, weights and
// (inset) shadows for colours or font families (dropping `text-body` from `text-body text-ink`),
// and does not know its easings at all.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['note', 'body-sm', 'body', 'lead', 'h1', 'h2'],
      'font-weight': ['label', 'strong'],
      shadow: ['window', 'menu'],
      'inset-shadow': ['avatar'],
      ease: ['spring', 'press', 'sheet'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isDecimal(text: string): text is `${number}` {
  return /^-?\d+(?:\.\d+)?$/.test(text);
}

// Built once per language: a list's search text formats every duel's amount and date per keystroke.
function perLanguage<T>(make: (locale: string) => T): Record<Language, T> {
  return { en: make(intlLocales.en), ru: make(intlLocales.ru) };
}

const usdtFormats = perLanguage((locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: USDT_DECIMALS }));
const dateTimeFormats = perLanguage(
  (locale) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
);
const dateFormats = perLanguage((locale) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }));

/**
 * A USDT amount the way the language writes numbers, with up to the token's 6 decimals, so 4.123456
 * is not shown as 4.12, and no trailing zeros: `20`, `0.5`, `1,234.5`, in Russian `1 234,5`.
 */
export function formatUSDT(amount: bigint, language: Language): string {
  // A decimal string, not a float, so Intl formats the exact amount.
  const decimal = formatUnits(amount, USDT_DECIMALS);
  if (!isDecimal(decimal)) throw new Error(`Not a decimal amount: ${decimal}`);
  return usdtFormats[language].format(decimal);
}

export function parseUSDT(amount: number): bigint {
  // Handle floating point by rounding to 6 decimal places
  const rounded = Math.round(amount * 10 ** USDT_DECIMALS);
  return BigInt(rounded);
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0s';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatDateTime(timestamp: bigint | number, language: Language): string {
  const seconds = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  if (!seconds) return '—';

  return dateTimeFormats[language].format(new Date(seconds * 1000));
}

/** A day in the language's medium style: `Oct 19, 2026`, `19 окт. 2026 г.`; a date that is none is a dash. */
export function formatDate(date: string | number | Date, language: Language): string {
  const day = new Date(date);
  if (Number.isNaN(day.getTime())) return '—';

  return dateFormats[language].format(day);
}
