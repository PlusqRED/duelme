// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PublicDuelCard } from '@/components/duel/PublicDuelCard';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { enrichPublicDuel } from '@/lib/publicDuelsFilters';
import { getReputationSummaryFromStats, type ReputationSummary } from '@/lib/reputation';

const CREATOR = '0x32a3000000000000000000000000000000aa23';

afterEach(cleanup);

function renderCard(stats: ReputationSummary | undefined) {
  const duel = enrichPublicDuel({
    duel: { id: 4, creator: CREATOR, wager: 5, wagerAmount: 5_000_000n, message: '', createdAt: 1n, chainId: DEFAULT_CHAIN_ID },
    meta: undefined,
    resolveDisplay: () => 'alice',
    reputationStatsByAddress: stats ? { [CREATOR]: stats } : {},
  });
  render(<PublicDuelCard duel={duel} timeAgo={() => 'now'} />);
}

describe('PublicDuelCard', () => {
  it('calls a creator with no duels yet New', () => {
    renderCard(getReputationSummaryFromStats(0, 0));

    expect([screen.queryByText('New'), screen.queryByText('No duel history')].every(Boolean)).toBe(true);
  });

  it('names no level while the creator’s record is unknown, rather than calling them New', () => {
    renderCard(undefined);

    expect([screen.queryByText('New'), screen.queryByText('No duel history')]).toEqual([null, null]);
  });
});
