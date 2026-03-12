import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { USDT_DECIMALS } from './constants';
import type { Language } from '@/i18n/translations';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatUSDT(amount: bigint): string {
  const divisor = BigInt(10 ** USDT_DECIMALS);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(USDT_DECIMALS, '0');
  // Trim trailing zeros but keep at least 2 decimal places
  const trimmed = fractionStr.replace(/0+$/, '').padEnd(2, '0');
  return `${whole}.${trimmed}`;
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

  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(seconds * 1000));
}
