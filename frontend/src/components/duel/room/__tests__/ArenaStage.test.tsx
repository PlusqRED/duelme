// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import { arenaView } from '@/lib/arenaView';
import { DuelState } from '@/lib/contracts';
import { getReputationSummaryFromStats } from '@/lib/reputation';
import { duelView } from '@/lib/__tests__/helpers/duelView';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useNicknames', () => ({
  useNicknames: () => ({ resolveDisplay: (address: string) => (address.startsWith('0xAa') ? 'Ace' : 'Bo') }),
}));
vi.mock('@/hooks/useReputationLevels', () => ({
  useReputationLevels: () => ({
    reputationStatsByAddress: { '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': getReputationSummaryFromStats(4, 0) },
  }),
}));

const { ArenaStage } = await import('@/components/duel/room/ArenaStage');

afterEach(cleanup);

const en = translations.en;
const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const OPPONENT = '0x111111111111111111111111111111111111abcd' as const;

function stage(overrides: Partial<Parameters<typeof ArenaStage>[0]> = {}) {
  return (
    <ArenaStage
      view={arenaView(duelView({ message: '2300 ELO' }), 'created')}
      players={{ creator: CREATOR, opponent: null }}
      viewerSide={null}
      chainId={421614}
      matchLabel="Match in Chess"
      clock={null}
      {...overrides}
    />
  );
}

describe('ArenaStage', () => {
  it('seats the creator by name and leaves the other seat open', () => {
    render(stage());

    expect(screen.getByText('Ace')).toBeTruthy();
    expect(screen.getByText(en['sim.openSeat'])).toBeTruthy();
    expect(screen.getByText('“2300 ELO”')).toBeTruthy();
  });

  it('calls the reader’s own seat You', () => {
    render(stage({ viewerSide: 'creator' }));

    expect(screen.getByText(en['room.you'])).toBeTruthy();
  });

  it('shows a player’s level while the duel runs', () => {
    render(stage());

    expect(screen.getByTitle(en['room.rep.stats'].replace('{honored}', '4').replace('{abandoned}', '0'))).toBeTruthy();
  });

  it('says what the safe does with the money', () => {
    render(stage());

    expect(screen.getByText(en['room.vault.waiting'])).toBeTruthy();
  });

  it('names the match over the locked safe, or says it is paused', () => {
    const joined = duelView({ opponent: OPPONENT, state: DuelState.Funded });
    const { rerender } = render(stage({ view: arenaView(joined, 'funded'), players: { creator: CREATOR, opponent: OPPONENT } }));
    expect(screen.getByText('Match in Chess')).toBeTruthy();

    rerender(
      stage({
        view: arenaView({ ...joined, cancelRequestedBy: CREATOR }, 'cancelReq'),
        players: { creator: CREATOR, opponent: OPPONENT },
      })
    );

    expect(screen.queryByText('Match in Chess')).toBeNull();
    // The match over the safe and the safe itself both say so.
    expect(screen.getAllByText(en['room.paused'])).toHaveLength(2);
  });
});
