import { describe, expect, it } from 'vitest';
import { ethReading, readingRaw, usdtReadings } from '@/lib/walletBalances';

describe('usdtReadings', () => {
  it('reads each network that answered', () => {
    const results = [
      { status: 'success', result: 2_000_000n },
      { status: 'success', result: 0n },
    ] as const;

    expect(usdtReadings(2, results, false)).toEqual([
      { kind: 'ready', raw: 2_000_000n },
      { kind: 'ready', raw: 0n },
    ]);
  });

  it('keeps a network still loading as checking', () => {
    expect(usdtReadings(2, undefined, false)).toEqual([{ kind: 'checking' }, { kind: 'checking' }]);
  });

  it('does not show a failed network as zero', () => {
    const results = [{ status: 'success', result: 2_000_000n }, { status: 'failure' }] as const;

    expect(usdtReadings(2, results, false)[1]).toEqual({ kind: 'error' });
  });

  it('marks every network failed when the whole read failed, even with old results cached', () => {
    const results = [
      { status: 'success', result: 2_000_000n },
      { status: 'success', result: 1n },
    ] as const;

    expect(usdtReadings(2, results, true)).toEqual([{ kind: 'error' }, { kind: 'error' }]);
  });
});

describe('ethReading', () => {
  it('reads a balance that answered', () => {
    expect(ethReading({ status: 'success', data: { value: 7n } })).toEqual({ kind: 'ready', raw: 7n });
  });

  it('is checking while it loads, and failed when it failed', () => {
    expect(ethReading({ status: 'pending' })).toEqual({ kind: 'checking' });
    expect(ethReading({ status: 'error', data: { value: 7n } })).toEqual({ kind: 'error' });
  });
});

describe('readingRaw', () => {
  it('gives the amount only once it is known', () => {
    expect(readingRaw({ kind: 'ready', raw: 0n })).toBe(0n);
    expect(readingRaw({ kind: 'checking' })).toBeNull();
    expect(readingRaw({ kind: 'error' })).toBeNull();
  });
});
