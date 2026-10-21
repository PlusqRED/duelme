// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryRow } from '@/components/dashboard/HistoryRow';
import { DuelState } from '@/lib/contracts';
import { ZERO_ADDRESS } from '@/lib/duel';
import type { MyDuel } from '@/lib/dashboard';
import type { OwedItem } from '@/lib/owed';
import { DASH_NOW, myDuel, READER, RIVAL } from '@/lib/__tests__/helpers/myDuel';

const CHESS = { name: 'Chess', category: 'STRATEGY' as const };

function renderRow(entry: MyDuel, { game = CHESS as typeof CHESS | null, owed = undefined as OwedItem | undefined } = {}) {
  const { container } = render(
    <HistoryRow entry={entry} game={game} nameOf={(address) => (address === RIVAL ? 'rival' : address)} owed={owed} isStamped={false} />
  );
  const row = container.firstElementChild;
  if (!(row instanceof HTMLElement)) throw new Error('No row');
  return row;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(DASH_NOW * 1000);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('HistoryRow', () => {
  it('leads to the duel', () => {
    renderRow(myDuel(12, { state: DuelState.Resolved, claimedWinner: READER }));

    expect(screen.getByRole('link', { name: /^Chess/ }).getAttribute('href')).toBe('/duel/12');
  });

  it('leads from the opponent’s name to their profile', () => {
    renderRow(myDuel(12, { state: DuelState.Resolved, claimedWinner: READER }));

    expect(screen.getByRole('link', { name: 'rival' }).getAttribute('href')).toBe(`/profile/${RIVAL.toLowerCase()}`);
  });

  it('names the game, the number and the opponent', () => {
    const row = renderRow(myDuel(12, { state: DuelState.Resolved, claimedWinner: READER }));

    expect(row.textContent).toContain('Chess#12');
    expect(row.textContent).toContain('vsrival');
  });

  it('marks a win with what it gained', () => {
    const row = renderRow(myDuel(12, { state: DuelState.Resolved, claimedWinner: READER, wagerAmount: 7_000_000n }));

    expect(row.textContent).toContain('Won');
    expect(row.textContent).toContain('+7USDT');
  });

  it('marks a loss with what it cost', () => {
    const row = renderRow(myDuel(12, { state: DuelState.Resolved, claimedWinner: RIVAL, wagerAmount: 7_000_000n }));

    expect(row.textContent).toContain('Lost');
    expect(row.textContent).toContain('−7USDT');
  });

  it('says why a duel ended without a winner, at no cost', () => {
    const row = renderRow(myDuel(12, { state: DuelState.Disputed }));

    expect(row.textContent).toContain('No winner');
    expect(row.textContent).toContain('±0USDT');
    expect(row.textContent).toContain('Result disputed');
  });

  it('says why a duel nobody joined ended, in place of an opponent', () => {
    const row = renderRow(myDuel(12, { state: DuelState.Cancelled, opponent: ZERO_ADDRESS }));

    expect(row.textContent).toContain('Cancelled before anyone joined');
    expect(row.textContent).not.toContain('vs');
  });

  it('says what of it is still the reader\'s to take', () => {
    const row = renderRow(myDuel(12, { state: DuelState.Resolved, claimedWinner: READER }), {
      owed: { duelId: 12, seat: 'creator', kind: 'win', raw: 10_000_000n },
    });

    expect(row.textContent).toContain('Yours to take: 10 USDT');
  });

  it('quotes the duel\'s message', () => {
    const row = renderRow(myDuel(12, { state: DuelState.Resolved, claimedWinner: READER, message: 'gg' }));

    expect(row.textContent).toContain('“gg”');
  });

  it('says how long ago the duel ended, with the moment on hover', () => {
    renderRow(myDuel(12, { state: DuelState.Resolved, claimedWinner: READER, finalizedAt: BigInt(DASH_NOW - 2 * 3600) }));

    const time = screen.getByText('2h ago');
    expect(time.getAttribute('dateTime')).toBe(new Date((DASH_NOW - 2 * 3600) * 1000).toISOString());
  });

  it('calls a duel without a game by its number', () => {
    const row = renderRow(myDuel(12, { state: DuelState.Resolved, claimedWinner: READER }), { game: null });

    expect(row.textContent).toContain('Duel #12');
  });
});
