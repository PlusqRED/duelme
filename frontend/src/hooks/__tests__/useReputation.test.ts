// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';

const PLAYER = '0x4bfa1486661d6faa5300923bd684f261ae4776a5';

const read = vi.hoisted(() => ({
  result: { data: undefined as { duelsHonored: bigint; duelsAbandoned: bigint } | undefined, isLoading: false, isError: false },
  enabled: undefined as boolean | undefined,
}));
vi.mock('wagmi', () => ({
  useReadContract: ({ query }: { query: { enabled: boolean } }) => {
    read.enabled = query.enabled;
    return read.result;
  },
}));

const { useReputation } = await import('@/hooks/useReputation');

beforeEach(() => {
  read.result = { data: undefined, isLoading: false, isError: false };
});

afterEach(cleanup);

describe('useReputation', () => {
  it('reads the level from the player\'s record on the contract', () => {
    read.result.data = { duelsHonored: 4n, duelsAbandoned: 0n };
    const { result } = renderHook(() => useReputation(PLAYER, DEFAULT_CHAIN_ID));

    expect(result.current).toMatchObject({ honored: 4, abandoned: 0, level: 'fair', isError: false });
  });

  it('says when the record could not be read, so nobody shows its zeros as a new player', () => {
    read.result.isError = true;
    const { result } = renderHook(() => useReputation(PLAYER, DEFAULT_CHAIN_ID));

    expect(result.current.isError).toBe(true);
  });

  it('reads nothing without a player', () => {
    renderHook(() => useReputation(undefined, DEFAULT_CHAIN_ID));

    expect(read.enabled).toBe(false);
  });
});
