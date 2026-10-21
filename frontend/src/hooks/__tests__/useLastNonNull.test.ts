// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useLastNonNull } from '@/hooks/useLastNonNull';

afterEach(cleanup);

function renderWith(initial: string | null) {
  return renderHook(({ value }) => useLastNonNull(value), { initialProps: { value: initial } });
}

describe('useLastNonNull', () => {
  it('returns the value it is given', () => {
    const { result } = renderWith('steam');

    expect(result.current).toBe('steam');
  });

  it('keeps the last value once it turns null', () => {
    const { result, rerender } = renderWith('steam');

    rerender({ value: null });

    expect(result.current).toBe('steam');
  });

  it('follows a new value after a null', () => {
    const { result, rerender } = renderWith('steam');
    rerender({ value: null });

    rerender({ value: 'telegram' });

    expect(result.current).toBe('telegram');
  });

  it('is null until it has seen a value', () => {
    const { result } = renderWith(null);

    expect(result.current).toBeNull();
  });
});
