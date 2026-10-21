import { describe, expect, it } from 'vitest';
import { cleanWagerInput, formatWagerInput, readWager } from '@/lib/wagerInput';

const MIN = 0.3;

describe('cleanWagerInput', () => {
  it('keeps digits and the first separator', () => {
    const text = '4,2.5';

    const cleaned = cleanWagerInput(text);

    expect(cleaned).toBe('4,25');
  });

  it('drops letters, spaces and signs', () => {
    const text = ' -1a2 USDT';

    const cleaned = cleanWagerInput(text);

    expect(cleaned).toBe('12');
  });

  it('leaves an empty field empty', () => {
    expect(cleanWagerInput('')).toBe('');
  });
});

describe('readWager', () => {
  it('reads a comma as the decimal separator', () => {
    const reading = readWager('4,2', MIN);

    expect(reading).toEqual({ kind: 'valid', amount: '4.2', raw: 4_200_000n, value: 4.2 });
  });

  it('reads a point the same way', () => {
    const reading = readWager('4.2', MIN);

    expect(reading).toEqual({ kind: 'valid', amount: '4.2', raw: 4_200_000n, value: 4.2 });
  });

  it('takes all six of USDT’s decimals exactly', () => {
    const reading = readWager('4.123456', MIN);

    expect(reading).toMatchObject({ kind: 'valid', raw: 4_123_456n });
  });

  it('refuses a seventh decimal', () => {
    const reading = readWager('4,1234567', MIN);

    expect(reading).toEqual({ kind: 'invalid', reason: 'decimals', value: 4.1234567 });
  });

  it('refuses a stake under the minimum', () => {
    const reading = readWager('0.2', MIN);

    expect(reading).toEqual({ kind: 'invalid', reason: 'min', value: 0.2 });
  });

  it('accepts exactly the minimum', () => {
    const reading = readWager('0,3', MIN);

    expect(reading).toMatchObject({ kind: 'valid', raw: 300_000n });
  });

  it('refuses zero', () => {
    expect(readWager('0', MIN)).toMatchObject({ kind: 'invalid', reason: 'min' });
  });

  it('reads a leading separator as a zero before it', () => {
    const reading = readWager(',5', MIN);

    expect(reading).toMatchObject({ kind: 'valid', amount: '0.5', raw: 500_000n });
  });

  it('reads a trailing separator as a whole amount', () => {
    const reading = readWager('7.', MIN);

    expect(reading).toMatchObject({ kind: 'valid', amount: '7', raw: 7_000_000n });
  });

  it('takes amounts past the slider’s end', () => {
    const reading = readWager('1250', MIN);

    expect(reading).toMatchObject({ kind: 'valid', raw: 1_250_000_000n });
  });

  it.each(['', '  ', '.', ','])('reads %j as no stake yet', (text) => {
    expect(readWager(text, MIN)).toEqual({ kind: 'empty' });
  });

  it('reads anything that is no amount, say from old storage, as no stake', () => {
    expect(readWager('abc', MIN)).toEqual({ kind: 'empty' });
  });

  it('follows a raised minimum', () => {
    expect(readWager('3', 5)).toMatchObject({ kind: 'invalid', reason: 'min' });
  });
});

describe('formatWagerInput', () => {
  it('writes a decimal point in English', () => {
    expect(formatWagerInput(4.5, 'en')).toBe('4.5');
  });

  it('writes a decimal comma in Russian', () => {
    expect(formatWagerInput(4.5, 'ru')).toBe('4,5');
  });

  it('writes a whole stake without a separator', () => {
    expect(formatWagerInput(25, 'ru')).toBe('25');
  });
});
