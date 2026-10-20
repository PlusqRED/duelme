// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reads = vi.hoisted(() => ({
  metas: [] as { duelId: number }[],
  duels: [] as { id: number; message: string }[],
  askedIds: [] as readonly number[],
}));

vi.mock('@/hooks/useDuelsByGame', () => ({ useDuelsByGame: (slug: string | undefined) => ({ duels: slug ? reads.metas : [] }) }));
vi.mock('@/hooks/useDuelReads', () => ({
  useDuelsByIds: (ids: readonly number[]) => {
    reads.askedIds = ids;
    return { duels: reads.duels };
  },
}));

const { useGameNote } = await import('@/hooks/useGameNote');

const LIMITS = { minWager: 0.3, claimTimeout: 3600, maxMessageCharacters: 32, maxMessageBytes: 128 };

beforeEach(() => {
  reads.metas = [{ duelId: 3 }, { duelId: 9 }];
  reads.duels = [
    { id: 3, message: 'old note' },
    { id: 9, message: ' 1x1 dust 2 awp ' },
  ];
});

afterEach(cleanup);

describe('useGameNote', () => {
  it('takes the newest note a duel of the game was made with', () => {
    const { result } = renderHook(() => useGameNote('cs-2', 421614, LIMITS));

    expect(result.current).toBe('1x1 dust 2 awp');
    expect(reads.askedIds).toEqual([9, 3]);
  });

  it('has no note without a game', () => {
    const { result } = renderHook(() => useGameNote(undefined, 421614, LIMITS));

    expect(result.current).toBeNull();
  });

  it('ignores a duel the game’s list does not name', () => {
    reads.duels = [{ id: 11, message: 'another game' }];

    const { result } = renderHook(() => useGameNote('cs-2', 421614, LIMITS));

    expect(result.current).toBeNull();
  });
});
