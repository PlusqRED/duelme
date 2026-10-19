// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BalanceReading } from '@/lib/walletBalances';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { useBalanceFigure } = await import('@/hooks/useBalanceFigure');

afterEach(cleanup);

function renderFigure(initial: BalanceReading) {
  return renderHook(({ reading }) => useBalanceFigure(reading), { initialProps: { reading: initial } });
}

describe('useBalanceFigure', () => {
  it('shows a known balance as USDT, with the amount beside it', () => {
    const { result } = renderFigure({ kind: 'ready', raw: 46_700_000n });

    expect(result.current.figure).toBe('46.7');
    expect(result.current.raw).toBe(46_700_000n);
  });

  it('shows an ellipsis while the balance is read, and a dash once the read failed', () => {
    const { result, rerender } = renderFigure({ kind: 'checking' });
    expect(result.current.figure).toBe('…');

    rerender({ reading: { kind: 'error' } });

    expect(result.current.figure).toBe('—');
    expect(result.current.raw).toBeNull();
  });

  it('says by how much the balance last moved', () => {
    const { result, rerender } = renderFigure({ kind: 'ready', raw: 5_000_000n });

    rerender({ reading: { kind: 'ready', raw: 8_000_000n } });

    expect(result.current.change?.delta).toBe(3_000_000n);
    expect(result.current.figure).toBe('8');
  });
});
