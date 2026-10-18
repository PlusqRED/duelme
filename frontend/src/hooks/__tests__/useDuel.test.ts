// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, LIVE_DATA_POLL_INTERVAL, ZERO_ADDRESS } from '@/lib/constants';
import { DuelState, type Duel } from '@/lib/contracts';

type PollInterval = (query: { state: { data: Duel | undefined } }) => number | false;
type ReadContractConfig = { query?: { refetchInterval?: PollInterval; staleTime?: number } };

const useReadContract = vi.hoisted(() =>
  vi.fn<(config: ReadContractConfig) => object>(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }))
);

vi.mock('wagmi', () => ({ useReadContract }));

const { useDuel } = await import('@/hooks/useDuel');

const PLAYER = '0x1111111111111111111111111111111111111111' as const;

function duel(overrides: Partial<Duel>): Duel {
  return {
    creator: PLAYER,
    opponent: ZERO_ADDRESS,
    invitedOpponent: ZERO_ADDRESS,
    wagerAmount: 5_000_000n,
    inviteHash: ZERO_ADDRESS,
    message: '',
    claimedWinner: ZERO_ADDRESS,
    claimedBy: ZERO_ADDRESS,
    cancelRequestedBy: ZERO_ADDRESS,
    createdAt: 1n,
    fundedAt: 0n,
    cancelRequestedAt: 0n,
    claimTimestamp: 0n,
    finalizedAt: 0n,
    creatorPayout: 0n,
    opponentPayout: 0n,
    creatorClaimed: false,
    opponentClaimed: false,
    state: DuelState.Created,
    ...overrides,
  };
}

function pollIntervalFor(data: Duel | undefined) {
  renderHook(() => useDuel(7n, DEFAULT_CHAIN.id));
  const [config] = useReadContract.mock.lastCall ?? [];

  return config?.query?.refetchInterval?.({ state: { data } });
}

describe('useDuel', () => {
  it('re-reads a duel in play so the other player\'s moves show without a reload', () => {
    expect(pollIntervalFor(duel({ state: DuelState.Funded }))).toBe(LIVE_DATA_POLL_INTERVAL);
  });

  it('keeps re-reading a finished duel while a payout is still waiting to be taken', () => {
    expect(pollIntervalFor(duel({ state: DuelState.Resolved, creatorPayout: 10_000_000n }))).toBe(
      LIVE_DATA_POLL_INTERVAL
    );
  });

  it('stops re-reading a finished duel once everything is paid out', () => {
    expect(
      pollIntervalFor(duel({ state: DuelState.Resolved, creatorPayout: 10_000_000n, creatorClaimed: true }))
    ).toBe(false);
  });

  it('treats every read as stale, so a refetch after a write is never skipped', () => {
    renderHook(() => useDuel(7n, DEFAULT_CHAIN.id));
    const [config] = useReadContract.mock.lastCall ?? [];

    expect(config?.query?.staleTime).toBe(0);
  });
});
