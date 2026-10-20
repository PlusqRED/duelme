// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyTotals } from '@/lib/dashboard';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';
import { READER } from '@/lib/__tests__/helpers/myDuel';

const env = vi.hoisted(() => ({ reduced: true, honored: 0, abandoned: 0, isLoading: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => env.reduced }));
vi.mock('@/hooks/useReputation', () => ({
  useReputation: () => ({ honored: env.honored, abandoned: env.abandoned, isLoading: env.isLoading, isError: false }),
}));

const { StandingCard } = await import('@/components/dashboard/StandingCard');

const TOTALS: MyTotals = { wins: 3, losses: 1, stakedRaw: 55_900_000n, takenRaw: 2_600_000n };

function renderCard(totals = TOTALS) {
  render(<StandingCard address={READER} walletAddress={READER.toLowerCase() as `0x${string}`} totals={totals} />);
}

beforeEach(() => {
  Object.assign(env, { reduced: true, honored: 0, abandoned: 0, isLoading: false });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('StandingCard', () => {
  it('heads the card with the reader\'s address and a way to their profile', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: '0x4BFa...76a5' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Profile' }).getAttribute('href')).toBe('/profile');
  });

  it('shows the level the record reaches, and both tallies', () => {
    env.honored = 4;
    env.abandoned = 1;

    renderCard();

    expect(screen.getByRole('heading', { name: 'Reputation' }).parentElement?.textContent).toContain('Risky');
    expect(screen.getByText('Honored').textContent).toBe('Honored 4');
    expect(screen.getByText('Abandoned').textContent).toBe('Abandoned 1');
  });

  it('says a first finished duel starts the record', () => {
    renderCard();

    expect(screen.getByText('Your first finished duel gives +1 honored.')).toBeTruthy();
  });

  it('counts the duels a clean record still needs, in words', () => {
    env.honored = 4;

    renderCard();

    expect(screen.getByText('1 more duel without an abandoned one, and you’re Reliable.')).toBeTruthy();
  });

  it('counts the honored duels a record with an abandoned one still needs', () => {
    env.honored = 4;
    env.abandoned = 1;

    renderCard();

    expect(screen.getByText(/^\d+ more honored duels?, and you’re Mixed\.$/)).toBeTruthy();
  });

  it('says the top level is reached', () => {
    env.honored = 40;

    renderCard();

    expect(screen.getByText('The highest level. An abandoned duel can lower it.')).toBeTruthy();
  });

  it('stands in for the reputation while it is read', () => {
    env.isLoading = true;

    renderCard();

    expect(screen.queryByRole('heading', { name: 'Reputation' })).toBeNull();
  });

  it('scores the wins against the losses', () => {
    renderCard();

    expect(screen.getByRole('img', { name: 'Wins 3, Losses 1' })).toBeTruthy();
  });

  it('adds up what the reader staked and took out', () => {
    renderCard();

    expect(screen.getByText('Staked').nextElementSibling?.textContent).toBe('55.9 USDT');
    expect(screen.getByText('Taken out').nextElementSibling?.textContent).toBe('2.6 USDT');
  });

  it('counts the totals up from zero the first time they are seen', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    env.reduced = false;
    renderCard();
    const staked = () => screen.getByText('Staked').nextElementSibling?.textContent;
    expect(staked()).toBe('0 USDT');

    const totals = screen.getByRole('heading', { name: 'Totals' }).parentElement;
    if (!totals) throw new Error('The totals have a box');
    act(() => FakeIntersectionObserver.watching(totals).report(totals, true));
    act(() => vi.advanceTimersByTime(1000));

    expect(staked()).toBe('55.9 USDT');
  });

  it('keeps the level badge out of sight until the pin has walked onto the scale', () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    env.reduced = false;
    env.honored = 4;
    renderCard();
    const head = screen.getByRole('heading', { name: 'Reputation' });
    const badge = () => head.nextElementSibling;
    expect(badge()?.classList.contains('opacity-0')).toBe(true);

    const reputation = head.parentElement?.parentElement;
    if (!reputation) throw new Error('The reputation has a box');
    act(() => FakeIntersectionObserver.watching(reputation).report(reputation, true));
    act(() => vi.advanceTimersByTime(520));

    expect(badge()?.classList.contains('animate-level-up')).toBe(true);
  });
});
