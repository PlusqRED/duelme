// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, LIVE_DATA_POLL_INTERVAL } from '@/lib/constants';
import { DuelState, type Duel } from '@/lib/contracts';
import { duelView } from '@/lib/__tests__/helpers/duelView';

type PollInterval = (query: { state: { data: Duel | undefined; dataUpdateCount: number } }) => number | false;
type ReadContractConfig = { query?: { refetchInterval?: PollInterval; staleTime?: number } };

function readResult(overrides: object = {}) {
  return { data: undefined, isLoading: false, isLoadingError: false, refetch: vi.fn(), ...overrides };
}

const useReadContract = vi.hoisted(() => vi.fn<(config: ReadContractConfig) => object>());

vi.mock('wagmi', () => ({ useReadContract }));

const { useDuel } = await import('@/hooks/useDuel');

function renderDuel(result = readResult()) {
  useReadContract.mockReturnValue(result);
  return renderHook(() => useDuel(7n, DEFAULT_CHAIN.id));
}

function pollIntervalFor(data: Duel, dataUpdateCount = 1) {
  renderDuel();
  const [config] = useReadContract.mock.lastCall ?? [];

  return config?.query?.refetchInterval?.({ state: { data, dataUpdateCount } });
}

afterEach(cleanup);

describe('useDuel', () => {
  it('re-reads a duel in play so the other player\'s moves show without a reload', () => {
    expect(pollIntervalFor(duelView({ state: DuelState.Funded }))).toBe(LIVE_DATA_POLL_INTERVAL);
  });

  it('keeps re-reading a finished duel while a payout is still waiting to be taken', () => {
    expect(pollIntervalFor(duelView({ state: DuelState.Resolved, creatorPayout: 10_000_000n }))).toBe(
      LIVE_DATA_POLL_INTERVAL
    );
  });

  it('stops re-reading a finished duel once everything is paid out', () => {
    expect(
      pollIntervalFor(duelView({ state: DuelState.Resolved, creatorPayout: 10_000_000n, creatorClaimed: true }))
    ).toBe(false);
  });

  it('keeps re-reading an id that reads as no duel for a while, as a fresh duel can lag on a node', () => {
    expect(pollIntervalFor(duelView({ state: DuelState.Nonexistent }), 5)).toBe(LIVE_DATA_POLL_INTERVAL);
  });

  it('stops re-reading an id that keeps reading as no duel', () => {
    expect(pollIntervalFor(duelView({ state: DuelState.Nonexistent }), 6)).toBe(false);
  });

  it('treats every read as stale, so a refetch after a write is never skipped', () => {
    renderDuel();
    const [config] = useReadContract.mock.lastCall ?? [];

    expect(config?.query?.staleTime).toBe(0);
  });

  it('keeps the duel on screen when a poll fails, rather than reporting it as not found', () => {
    const duel = duelView({ state: DuelState.Funded });

    const { result } = renderDuel(readResult({ data: duel, isError: true, isLoadingError: false }));

    expect(result.current.duel).toBe(duel);
    expect(result.current.isError).toBe(false);
  });

  it('reports an error when the duel never loaded', () => {
    const { result } = renderDuel(readResult({ isError: true, isLoadingError: true }));

    expect(result.current.isError).toBe(true);
  });
});
