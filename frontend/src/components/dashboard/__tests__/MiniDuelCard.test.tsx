// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuelState } from '@/lib/contracts';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';
import type { MyDuel } from '@/lib/dashboard';
import { storeInviteSecret } from '@/lib/invite';
import { DASH_NOW, myDuel, RIVAL } from '@/lib/__tests__/helpers/myDuel';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useNicknames', () => ({ useNicknames: () => ({ resolveDisplay: (address: string) => address }) }));
vi.mock('@/hooks/useReputationLevels', () => ({ useReputationLevels: () => ({ reputationStatsByAddress: {} }) }));

const { MiniDuelCard } = await import('@/components/dashboard/MiniDuelCard');

const CHESS = { name: 'Chess', category: 'STRATEGY' as const };
const SECRET = `0x${'cd'.repeat(32)}` as const;

function renderCard(entry: MyDuel, { game = CHESS as typeof CHESS | null } = {}) {
  render(
    <MiniDuelCard entry={entry} game={game} nameOf={(address) => (address === RIVAL ? 'rival' : address)} claimTimeout={86_400} order={0} isWide={false} />
  );
  return screen.getByRole('article');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(DASH_NOW * 1000);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('MiniDuelCard', () => {
  it('heads the card with the game, its number and the stake', () => {
    const card = renderCard(myDuel(7, { wagerAmount: 14_000_000n }));

    expect(screen.getByRole('link', { name: 'Duel #7: Chess' }).getAttribute('href')).toBe('/duel/7');
    expect(card.textContent).toContain('Duel #7');
    expect(card.textContent).toContain('14\u00a0USDT each');
  });

  it('calls a duel without a game by its number', () => {
    renderCard(myDuel(7), { game: null });

    expect(screen.getByRole('heading', { name: 'Duel #7' })).toBeTruthy();
  });

  it('asks the reader to report the result of a match that is on, in their seat\'s colour', () => {
    const card = renderCard(myDuel(7));

    expect(card.getAttribute('data-tone')).toBe('creator');
    expect(card.textContent).toContain('The match is on. Once it’s played, report the result.');
    expect(screen.getByRole('link', { name: 'Report the result' }).getAttribute('href')).toBe('/duel/7');
  });

  it('names the other player who reported a win to answer', () => {
    renderCard(myDuel(7, { state: DuelState.WinnerClaimed, claimedBy: RIVAL, claimedWinner: RIVAL, claimTimestamp: BigInt(DASH_NOW - 60) }));

    expect(screen.getByText('rival says the win is theirs. Confirm or dispute.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Answer' })).toBeTruthy();
  });

  it('only opens a duel that waits on the other player, in no seat colour', () => {
    const card = renderCard(myDuel(7, { state: DuelState.Created, opponent: ZERO_ADDRESS }));

    expect(card.getAttribute('data-tone')).toBeNull();
    expect(screen.getByRole('link', { name: 'Open the duel' })).toBeTruthy();
  });

  it('offers the invite link of a private duel waiting for its opponent', () => {
    storeInviteSecret(DEFAULT_CHAIN_ID, DUELME_ADDRESSES[DEFAULT_CHAIN_ID], 7, SECRET);

    renderCard(myDuel(7, { state: DuelState.Created, opponent: ZERO_ADDRESS, inviteHash: `0x${'ef'.repeat(32)}` }));

    expect(screen.getByRole('button', { name: 'Copy the link' })).toBeTruthy();
  });

  it('offers no link for a public duel, which the lobby lists', () => {
    storeInviteSecret(DEFAULT_CHAIN_ID, DUELME_ADDRESSES[DEFAULT_CHAIN_ID], 7, SECRET);

    renderCard(myDuel(7, { state: DuelState.Created, opponent: ZERO_ADDRESS }));

    expect(screen.queryByRole('button', { name: 'Copy the link' })).toBeNull();
  });

  it('draws the duel\'s arena with both players', () => {
    const card = renderCard(myDuel(7));

    expect(card.textContent).toContain('You');
  });
});
