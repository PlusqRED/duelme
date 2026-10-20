// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import { DuelState } from '@/lib/contracts';
import type { FeedDuel } from '@/lib/duelFeed';
import { phaseLabel } from '@/lib/duelPhase';
import { duelMeta } from '@/lib/__tests__/helpers/duelMeta';

vi.mock('@/hooks/useTimeAgo', () => ({ useTimeAgo: () => () => '2d ago' }));

const { DuelFeed, FEED_PAGE_SIZE } = await import('@/components/feed/DuelFeed');

const CREATOR = '0x1111111111111111111111111111111111111111';
const OPPONENT = '0x2222222222222222222222222222222222222222';

function duel(id: number, state: DuelState, overrides: Partial<FeedDuel> = {}): FeedDuel {
  return {
    id,
    player1: CREATOR,
    player2: OPPONENT,
    wagerAmount: 5_000_000n,
    message: '',
    winner: state === DuelState.Resolved ? CREATOR : '0x0000000000000000000000000000000000000000',
    lastEventAt: 1_700_000_000n,
    claimTimestamp: 0n,
    state,
    creatorPayout: state === DuelState.Resolved ? 10_000_000n : 0n,
    opponentPayout: 0n,
    creatorClaimed: false,
    opponentClaimed: false,
    creatorName: 'alice',
    opponentName: 'bob',
    game: duelMeta(id, 'chess', { gameName: 'Chess' }),
    ...overrides,
  };
}

function Feed({ duels }: { duels: FeedDuel[] }) {
  const [query, setQuery] = useState('');
  return <DuelFeed duels={duels} isLoading={false} query={query} onQueryChange={setQuery} empty={<p>Nothing yet</p>} />;
}

const rows = () => screen.queryAllByRole('button', { name: /Chess #\d/ });

afterEach(cleanup);

describe('DuelFeed', () => {
  it('counts what each state filter holds', () => {
    render(<Feed duels={[duel(3, DuelState.Resolved), duel(2, DuelState.Funded), duel(1, DuelState.Refunded)]} />);

    expect(screen.getByRole('button', { name: 'Won 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'In play 1' })).toBeTruthy();
  });

  it('keeps the duels of the state picked', () => {
    render(<Feed duels={[duel(3, DuelState.Resolved), duel(2, DuelState.Funded)]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Won 1' }));

    expect(rows().map((row) => row.textContent?.match(/#\d/)?.[0])).toEqual(['#3']);
  });

  it('keeps the duels the search finds', () => {
    render(<Feed duels={[duel(3, DuelState.Resolved, { opponentName: 'carol' }), duel(2, DuelState.Funded)]} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'carol' } });

    expect(rows()).toHaveLength(1);
  });

  it('says when nothing matches, and clears the search and filter on request', () => {
    render(<Feed duels={[duel(2, DuelState.Funded)]} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nobody' } });

    expect(screen.getByText(translations.en['feed.noMatches'])).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(rows()).toHaveLength(1);
  });

  it('shows what the caller gave in place of a list nobody joined', () => {
    render(<Feed duels={[]} />);

    expect(screen.getByText('Nothing yet')).toBeTruthy();
  });

  it('shows twenty rows a page and the way to the rest', () => {
    const duels = Array.from({ length: FEED_PAGE_SIZE + 5 }, (_, index) => duel(100 - index, DuelState.Funded));
    render(<Feed duels={duels} />);
    expect(rows()).toHaveLength(FEED_PAGE_SIZE);

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

    expect(rows()).toHaveLength(5);
  });

  it('names a duel still played by its state, without a winner', () => {
    const played = duel(2, DuelState.Funded);
    render(<Feed duels={[played]} />);

    const row = rows()[0];
    expect(within(row).getByText(translations.en[phaseLabel(played, 'funded').key])).toBeTruthy();
    expect(within(row).queryByText('won')).toBeNull();
  });
});

describe('DuelReceipt in a feed row', () => {
  function open(feedDuel: FeedDuel) {
    render(<Feed duels={[feedDuel]} />);
    const row = rows()[0];
    fireEvent.click(row);
    const panel = document.getElementById(row.getAttribute('aria-controls') ?? '');
    if (!panel) throw new Error('No receipt panel');
    return panel;
  }

  it('pays the whole pot to the winner of a won duel', () => {
    const panel = open(duel(3, DuelState.Resolved));

    expect(within(panel).getByText('To the winner')).toBeTruthy();
  });

  it('keeps the pot for a winner still to come while the duel is played', () => {
    const panel = open(duel(2, DuelState.Funded));

    expect(within(panel).getByText('+10')).toBeTruthy();
  });

  it('sends each stake back from a refunded duel', () => {
    const panel = open(duel(1, DuelState.Refunded));

    expect(within(panel).getByText('Back to each')).toBeTruthy();
    expect(within(panel).getAllByText('+5')).toHaveLength(2);
  });

  it('links to the duel', () => {
    const panel = open(duel(1, DuelState.Refunded));

    expect(within(panel).getByRole('link', { name: 'Open duel #1' }).getAttribute('href')).toBe('/duel/1');
  });
});
