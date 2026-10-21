// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionFlowConfig, DuelActions } from '@/lib/actionFlow';
import { summarizeOwed, type Owed, type OwedItem } from '@/lib/owed';

const fake = vi.hoisted(() => ({
  stage: null as string | null,
  openFlow: vi.fn(),
  refundAndClaimPayouts: vi.fn(),
}));
vi.mock('@/hooks/useActionFlow', () => ({
  useActionFlow: () => ({
    flow: fake.stage === null ? null : { stage: fake.stage },
    openFlow: fake.openFlow,
  }),
}));

const { useDashboardTake } = await import('@/hooks/useDashboardTake');

const WIN: OwedItem = { duelId: 7, seat: 'opponent', kind: 'win', raw: 10_000_000n };
const BACK: OwedItem = { duelId: 3, seat: 'creator', kind: 'back', raw: 5_000_000n };
const LATE: OwedItem = { duelId: 2, seat: 'creator', kind: 'late', raw: 2_500_000n };

function owedOf(items: OwedItem[]): Owed | null {
  return summarizeOwed(items);
}

function openedConfig(): ActionFlowConfig {
  const [config] = fake.openFlow.mock.lastCall ?? [];
  if (!config) throw new Error('No flow was opened');
  return config;
}

beforeEach(() => {
  fake.stage = null;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useDashboardTake', () => {
  it('takes every duel that holds money for the reader in one call, stakes and timed-out ones too', () => {
    const { result } = renderHook(() => useDashboardTake(owedOf([WIN, BACK, LATE]), vi.fn()));

    act(() => result.current.take());
    openedConfig().execute({ refundAndClaimPayouts: fake.refundAndClaimPayouts } as unknown as DuelActions);

    expect(fake.refundAndClaimPayouts).toHaveBeenCalledWith([7n, 3n, 2n]);
  });

  it('shows the sum and how many duels it comes from before signing', () => {
    const { result } = renderHook(() => useDashboardTake(owedOf([WIN, BACK]), vi.fn()));

    act(() => result.current.take());

    expect(openedConfig()).toMatchObject({ type: 'refundAndClaimAll', batch: { count: 2, totalDisplay: '15\u00a0USDT', closesTimedOut: false } });
  });

  it('tells the window when a timed-out duel is among them', () => {
    const { result } = renderHook(() => useDashboardTake(owedOf([WIN, LATE]), vi.fn()));

    act(() => result.current.take());

    expect(openedConfig().batch?.closesTimedOut).toBe(true);
  });

  it('opens no second window while one is open', () => {
    fake.stage = 'review';
    const { result } = renderHook(() => useDashboardTake(owedOf([WIN]), vi.fn()));

    act(() => result.current.take());

    expect(fake.openFlow).not.toHaveBeenCalled();
  });

  it('keeps what was taken out of the safe once the chain confirms, before the history is read again', () => {
    const owed = owedOf([WIN, BACK]);
    const { result, rerender } = renderHook(() => useDashboardTake(owed, vi.fn()));
    act(() => result.current.take());

    fake.stage = 'success';
    rerender();

    expect([result.current.owed, result.current.takenRaw]).toEqual([null, 15_000_000n]);
  });

  it('shows money that arrived after the Take', () => {
    let owed = owedOf([WIN]);
    const { result, rerender } = renderHook(() => useDashboardTake(owed, vi.fn()));
    act(() => result.current.take());
    fake.stage = 'success';
    rerender();

    owed = owedOf([WIN, BACK]);
    rerender();

    expect(result.current.owed?.items).toEqual([BACK]);
  });

  it('has nothing taken before a Take succeeds', () => {
    const { result } = renderHook(() => useDashboardTake(owedOf([WIN]), vi.fn()));

    act(() => result.current.take());

    expect([result.current.owed?.totalRaw, result.current.takenRaw]).toEqual([10_000_000n, null]);
  });
});
