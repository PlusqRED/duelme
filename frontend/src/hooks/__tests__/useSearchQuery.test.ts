// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSearchQuery } from '@/hooks/useSearchQuery';

beforeEach(() => {
  window.history.replaceState(null, '', '/duels/recent');
});

afterEach(cleanup);

describe('useSearchQuery', () => {
  it('starts from the search the address came with', () => {
    const { result } = renderHook(() => useSearchQuery('chess'));

    expect(result.current.query).toBe('chess');
  });

  it('writes the search into the address as it is typed', () => {
    const { result } = renderHook(() => useSearchQuery(''));

    act(() => result.current.setQuery('alice'));

    expect([result.current.query, `${window.location.pathname}${window.location.search}`]).toEqual(['alice', '/duels/recent?q=alice']);
  });

  it('takes a cleared search out of the address', () => {
    window.history.replaceState(null, '', '/duels/recent?q=alice');
    const { result } = renderHook(() => useSearchQuery('alice'));

    act(() => result.current.setQuery(''));

    expect(window.location.search).toBe('');
  });
});
