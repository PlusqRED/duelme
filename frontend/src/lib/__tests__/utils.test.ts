import { describe, expect, it } from 'vitest';
import { cn, formatDate, formatUSDT } from '@/lib/utils';
import { themeTokens } from '@/lib/__tests__/helpers/sourceFiles';

describe('cn', () => {
  it.each([...themeTokens('text').keys()])('keeps the type size text-%s beside a text colour', (size) => {
    expect(cn(`text-${size}`, 'text-ink')).toBe(`text-${size} text-ink`);
  });

  it.each([...themeTokens('font-weight').keys()])('keeps the weight font-%s beside a font family', (weight) => {
    expect(cn(`font-${weight}`, 'font-sans')).toBe(`font-${weight} font-sans`);
  });

  it.each([...themeTokens('shadow').keys()])('keeps the shadow shadow-%s beside a shadow colour', (shadow) => {
    expect(cn(`shadow-${shadow}`, 'shadow-ink/20')).toBe(`shadow-${shadow} shadow-ink/20`);
  });

  it.each([...themeTokens('shadow').keys()])('lets a later shadow replace shadow-%s', (shadow) => {
    expect(cn(`shadow-${shadow}`, 'shadow-lg')).toBe('shadow-lg');
  });

  it.each([...themeTokens('inset-shadow').keys()])('keeps the inset shadow inset-shadow-%s beside its colour', (shadow) => {
    expect(cn(`inset-shadow-${shadow}`, 'inset-shadow-ink/20')).toBe(`inset-shadow-${shadow} inset-shadow-ink/20`);
  });

  it.each([...themeTokens('ease').keys()])('lets a later easing replace ease-%s', (ease) => {
    expect(cn(`ease-${ease}`, 'ease-in')).toBe('ease-in');
  });

  it('lets a later type size replace an earlier one', () => {
    expect(cn('text-body', 'text-note')).toBe('text-note');
  });

  it('lets a later colour replace an earlier one', () => {
    expect(cn('bg-ink text-paper', 'bg-sun text-ink')).toBe('bg-sun text-ink');
  });
});

describe('formatUSDT', () => {
  it.each([
    [20_000_000n, '20'],
    [500_000n, '0.5'],
    [4_123_456n, '4.123456'],
    [1n, '0.000001'],
    [1_234_500_000n, '1,234.5'],
    [0n, '0'],
  ])('writes %s base units as %s in English', (amount, text) => {
    expect(formatUSDT(amount, 'en')).toBe(text);
  });

  it('writes Russian with its own separators', () => {
    expect(formatUSDT(1_234_500_000n, 'ru')).toBe('1\u00a0234,5');
  });

  it('keeps every digit of an amount past what a float holds', () => {
    expect(formatUSDT(123_456_789_012_345_678n, 'en')).toBe('123,456,789,012.345678');
  });
});

describe('formatDate', () => {
  // Local noon, so the day is the same in every time zone the tests run in.
  const day = new Date(2026, 9, 19, 12);

  it('writes a day in the language’s medium style', () => {
    expect(formatDate(day, 'en')).toBe('Oct 19, 2026');
  });

  it('writes a Russian day as Russian does', () => {
    expect(formatDate(day, 'ru')).toBe('19 окт. 2026 г.');
  });

  it('shows a dash rather than failing on a date that is none', () => {
    expect(formatDate('not a date', 'en')).toBe('—');
  });
});
