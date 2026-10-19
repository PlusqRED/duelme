// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBalanceChange } from '@/hooks/useBalanceChange';

afterEach(cleanup);

function renderChange(initial: bigint | null) {
  return renderHook(({ value }) => useBalanceChange(value), { initialProps: { value: initial } });
}

describe('useBalanceChange', () => {
  it('has no change for the first amount', () => {
    const { result } = renderChange(5n);

    expect(result.current).toBeNull();
  });

  it('says how much money came in', () => {
    const { result, rerender } = renderChange(5n);

    rerender({ value: 105n });

    expect(result.current).toEqual({ id: 1, delta: 100n });
  });

  it('says how much money went out, with a new id for the new move', () => {
    const { result, rerender } = renderChange(5n);
    rerender({ value: 105n });

    rerender({ value: 100n });

    expect(result.current).toEqual({ id: 2, delta: -5n });
  });

  it('does not count a balance that became known as a move', () => {
    const { result, rerender } = renderChange(null);

    rerender({ value: 105n });

    expect(result.current).toBeNull();
  });

  it('does not count a read that failed and came back as a move', () => {
    const { result, rerender } = renderChange(5n);
    rerender({ value: null });

    rerender({ value: 105n });

    expect(result.current).toBeNull();
  });

  it('keeps the last move while the balance stays', () => {
    const { result, rerender } = renderChange(5n);
    rerender({ value: 7n });

    rerender({ value: 7n });

    expect(result.current).toEqual({ id: 1, delta: 2n });
  });
});
