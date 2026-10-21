import { describe, expect, it } from 'vitest';
import { isRecord, parseUintString } from '@/lib/parsing';

describe('isRecord', () => {
  it('takes a plain object', () => {
    expect(isRecord({ enabled: true })).toBe(true);
  });

  it.each([null, [], 'text', 1, undefined])('refuses %j', (value) => {
    expect(isRecord(value)).toBe(false);
  });
});

describe('parseUintString', () => {
  it.each([
    ['0', 0n],
    ['5000000', 5_000_000n],
    ['115792089237316195423570985008687907853269984665640564039457584007913129639935', 2n ** 256n - 1n],
  ])('reads %s', (text, value) => {
    expect(parseUintString(text)).toBe(value);
  });

  it.each(['', '01', '-1', '0x10', '1e9', '1.5', ' 1', 5])('refuses %j', (value) => {
    expect(parseUintString(value)).toBeNull();
  });
});
