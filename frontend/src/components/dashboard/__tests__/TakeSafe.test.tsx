// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuelState } from '@/lib/contracts';
import type { MyDuel } from '@/lib/dashboard';
import { summarizeOwed, type Owed, type OwedItem } from '@/lib/owed';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';
import { DASH_NOW, DASH_TIMEOUT, myDuel, READER, RIVAL } from '@/lib/__tests__/helpers/myDuel';

const env = vi.hoisted(() => ({ reduced: true, relayed: true }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => env.reduced }));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => ({ isRelayEnabled: env.relayed, forwarderAddress: undefined }) }));

const { TakeSafe } = await import('@/components/dashboard/TakeSafe');

const WON = myDuel(7, { state: DuelState.Resolved, claimedWinner: READER, creatorPayout: 10_000_000n });
const BACK = myDuel(3, { state: DuelState.Refunded, creatorPayout: 5_000_000n });
const LATE = myDuel(2, { state: DuelState.WinnerClaimed, claimedBy: READER, claimedWinner: READER, claimTimestamp: BigInt(DASH_NOW - DASH_TIMEOUT - 1) });

const ITEMS: Record<number, OwedItem> = {
  7: { duelId: 7, seat: 'creator', kind: 'win', raw: 10_000_000n },
  3: { duelId: 3, seat: 'creator', kind: 'back', raw: 5_000_000n },
  2: { duelId: 2, seat: 'creator', kind: 'late', raw: 2_500_000n },
};

function renderSafe(entries: MyDuel[], { onTake = vi.fn(), isBusy = false } = {}) {
  const owed: Owed | null = summarizeOwed(entries.map((entry) => ITEMS[entry.duel.id]));
  if (!owed) throw new Error('A safe needs money in it');
  render(
    <TakeSafe
      owed={owed}
      entryById={new Map(entries.map((entry) => [entry.duel.id, entry]))}
      gameOf={(id) => (id === 7 ? { name: 'Chess', category: 'STRATEGY' } : null)}
      nameOf={(address) => (address === RIVAL ? 'rival' : address)}
      onTake={onTake}
      isBusy={isBusy}
    />
  );
  return onTake;
}

beforeEach(() => {
  env.reduced = true;
  env.relayed = true;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('TakeSafe', () => {
  it('says how much the contract keeps for the reader', () => {
    renderSafe([WON, BACK]);

    expect(screen.getByRole('region', { name: 'Waiting for you in the contract' }).textContent).toContain('15USDT');
  });

  it('lists each duel\'s money: a win, and a stake coming back with why', () => {
    renderSafe([WON, BACK]);

    const items = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(items[0]).toContain('Win');
    expect(items[0]).toContain('Chess, duel #7');
    expect(items[1]).toContain('Stake back');
    expect(items[1]).toContain('No answer in time');
  });

  it('says what closing a timed-out duel does to both records', () => {
    renderSafe([LATE]);

    expect(screen.getByText('When it closes: +1 honored to you, +1 abandoned to rival.')).toBeTruthy();
  });

  it('takes it all with one press', () => {
    const onTake = renderSafe([WON, BACK, LATE]);

    fireEvent.click(screen.getByRole('button', { name: /^Take 17\.5\sUSDT$/ }));

    expect(onTake).toHaveBeenCalledOnce();
  });

  it('waits while the signing window is open', () => {
    renderSafe([WON], { isBusy: true });

    expect(screen.getByRole('button', { name: /^Take 10\sUSDT$/ }).hasAttribute('disabled')).toBe(true);
  });

  it('says DuelMe pays the network fee when the relayer runs', () => {
    renderSafe([WON]);

    expect(screen.getByText('One signature for all of it. DuelMe pays the network fee.')).toBeTruthy();
  });

  it('says the wallet pays the fee in ETH when the relayer is off', () => {
    env.relayed = false;

    renderSafe([WON]);

    expect(screen.getByText('One transaction for all of it, its network fee paid in ETH from your wallet.')).toBeTruthy();
  });

  it('counts the sum up from zero once the safe is seen and its lock has opened', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    env.reduced = false;
    renderSafe([WON]);
    const safe = screen.getByRole('region');
    const sum = () => safe.querySelector('b')?.textContent;
    expect(sum()).toBe('0');

    act(() => FakeIntersectionObserver.watching(safe).report(safe, true));
    act(() => vi.advanceTimersByTime(250));
    act(() => vi.advanceTimersByTime(1000));

    expect(sum()).toBe('10');
  });

  it('keeps the bars out of sight until the safe is seen, then drops them in', () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    env.reduced = false;
    renderSafe([WON]);
    const safe = screen.getByRole('region');
    const bar = () => safe.querySelector('li > :first-child');
    expect(bar()?.classList.contains('opacity-0')).toBe(true);

    act(() => FakeIntersectionObserver.watching(safe).report(safe, true));

    expect(bar()?.classList.contains('animate-bar-drop')).toBe(true);
  });
});
