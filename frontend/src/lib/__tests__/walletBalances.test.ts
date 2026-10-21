import { describe, expect, it } from 'vitest';
import { balanceReading, readingFigure, readingRaw } from '@/lib/walletBalances';

describe('balanceReading', () => {
  it('reads a balance that answered, zero included', () => {
    expect(balanceReading({ status: 'success', data: 7n })).toEqual({ kind: 'ready', raw: 7n });
    expect(balanceReading({ status: 'success', data: 0n })).toEqual({ kind: 'ready', raw: 0n });
  });

  it('is checking while it loads', () => {
    expect(balanceReading({ status: 'pending' })).toEqual({ kind: 'checking' });
  });

  it('is failed when the read failed, even with an old amount cached, never a zero', () => {
    expect(balanceReading({ status: 'error', data: 7n })).toEqual({ kind: 'error' });
  });
});

describe('readingRaw', () => {
  it('gives the amount only once it is known', () => {
    expect(readingRaw({ kind: 'ready', raw: 0n })).toBe(0n);
    expect(readingRaw({ kind: 'checking' })).toBeNull();
    expect(readingRaw({ kind: 'error' })).toBeNull();
  });
});

describe('readingFigure', () => {
  const format = (raw: bigint) => `${raw} units`;

  it('shows a known amount the way it is asked to', () => {
    expect(readingFigure({ kind: 'ready', raw: 0n }, format)).toBe('0 units');
  });

  it('shows an ellipsis while the balance is read, and a dash once the read failed', () => {
    expect(readingFigure({ kind: 'checking' }, format)).toBe('…');
    expect(readingFigure({ kind: 'error' }, format)).toBe('—');
  });
});
