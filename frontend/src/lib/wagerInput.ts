import { parseUnits } from 'viem';
import type { Language } from '@/i18n/translations';
import { USDT_DECIMALS } from '@/lib/constants';

/** The stake field as the contract would take it, or why it would not. */
export type WagerReading =
  | { kind: 'empty' }
  /** Typed, but not a stake: more decimals than USDT has, or under the contract's minimum. `value` places the slider. */
  | { kind: 'invalid'; reason: 'decimals' | 'min'; value: number }
  /** `amount` is the decimal string `parseUnits` takes, with a point: what the create call gets. */
  | { kind: 'valid'; amount: string; raw: bigint; value: number };

const DECIMAL = /^\d*\.?\d*$/;

/** Digits and one decimal separator, a comma or a point; anything else typed into the stake field is dropped. */
export function cleanWagerInput(text: string): string {
  const kept = text.replace(/[^\d.,]/g, '');
  const at = kept.search(/[.,]/);
  return at === -1 ? kept : kept.slice(0, at + 1) + kept.slice(at + 1).replace(/[.,]/g, '');
}

/**
 * The stake field read the way people type it: «4,2» and «4.2» are the same stake. An amount is read
 * as a decimal string and converted by `parseUnits`, never through a float, so what the field says
 * is exactly what the contract gets.
 */
export function readWager(text: string, minWager: number): WagerReading {
  const typed = text.trim().replace(',', '.');
  if (typed === '' || typed === '.' || !DECIMAL.test(typed)) return { kind: 'empty' };
  const [whole, fraction = ''] = typed.split('.');
  const amount = fraction ? `${whole || '0'}.${fraction}` : whole;
  const value = Number(amount);
  if (fraction.length > USDT_DECIMALS) return { kind: 'invalid', reason: 'decimals', value };
  const raw = parseUnits(amount, USDT_DECIMALS);
  if (raw < parseUnits(minWager.toFixed(USDT_DECIMALS), USDT_DECIMALS)) return { kind: 'invalid', reason: 'min', value };
  return { kind: 'valid', amount, raw, value };
}

/** A stake picked on the slider, written into the field the way the reader's language writes a decimal. */
export function formatWagerInput(value: number, language: Language): string {
  const text = String(value);
  return language === 'ru' ? text.replace('.', ',') : text;
}
