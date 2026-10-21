import { describe, expect, it } from 'vitest';
import { DuelState } from '@/lib/contracts';
import {
  goKey,
  lastMoveAt,
  myDuels,
  myTotals,
  netOf,
  otherOf,
  outcomeOf,
  phaseClock,
  reportedWin,
  turnLineKey,
  turnOf,
  type MyDuel,
} from '@/lib/dashboard';
import { ZERO_ADDRESS, type DuelRecord } from '@/lib/duel';
import { duelPhase } from '@/lib/duelPhase';
import { duelView } from './helpers/duelView';

const ME: `0x${string}` = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const THEM: `0x${string}` = '0x1111111111111111111111111111111111111111';
const NOW = 1_800_000_000;
const TIMEOUT = 86_400;

function duel(id: number, overrides: Partial<DuelRecord> = {}): DuelRecord {
  return { ...duelView({ creator: ME, opponent: THEM, state: DuelState.Funded, ...overrides }), id };
}

function mine(record: DuelRecord): MyDuel {
  return { duel: record, phase: duelPhase(record, NOW, TIMEOUT), seat: record.creator === ME ? 'creator' : 'opponent' };
}

/** A win reported `ago` seconds before now. */
function claimed(id: number, claimedBy: `0x${string}`, ago: number, overrides: Partial<DuelRecord> = {}): DuelRecord {
  return duel(id, { state: DuelState.WinnerClaimed, claimedBy, claimedWinner: claimedBy, claimTimestamp: BigInt(NOW - ago), ...overrides });
}

describe('turnOf', () => {
  it('gives the reader the move in a match that is on', () => {
    expect(turnOf(mine(duel(1)))).toBe('you');
  });

  it('gives the reader the answer to a win the other player reported', () => {
    expect(turnOf(mine(claimed(1, THEM, 60)))).toBe('you');
  });

  it('waits for the other player after the reader reported the win', () => {
    expect(turnOf(mine(claimed(1, ME, 60)))).toBe('them');
  });

  it('gives the reader the answer to a request to stop the duel', () => {
    expect(turnOf(mine(duel(1, { state: DuelState.MutualCancelRequested, cancelRequestedBy: THEM })))).toBe('you');
  });

  it('waits for an opponent while nobody has joined', () => {
    expect(turnOf(mine(duel(1, { state: DuelState.Created, opponent: ZERO_ADDRESS })))).toBe('them');
  });
});

describe('turnLineKey', () => {
  it('tells a public duel waiting in the lobby from a private one', () => {
    const open = mine(duel(1, { state: DuelState.Created, opponent: ZERO_ADDRESS }));
    const invited = mine(duel(2, { state: DuelState.Created, opponent: ZERO_ADDRESS, inviteHash: `0x${'ab'.repeat(32)}` }));

    expect([turnLineKey(open), turnLineKey(invited)]).toEqual(['dash.line.created.public', 'dash.line.created.private']);
  });

  it('says who reported the win', () => {
    expect([turnLineKey(mine(claimed(1, ME, 60))), turnLineKey(mine(claimed(2, THEM, 60)))]).toEqual([
      'dash.line.claimed.you',
      'dash.line.claimed.other',
    ]);
  });

  it('says who asked to stop the duel', () => {
    const asked = (by: `0x${string}`) => mine(duel(1, { state: DuelState.MutualCancelRequested, cancelRequestedBy: by }));

    expect([turnLineKey(asked(ME)), turnLineKey(asked(THEM))]).toEqual(['dash.line.cancelReq.you', 'dash.line.cancelReq.other']);
  });

  it('asks for the result of a match that is on', () => {
    expect(turnLineKey(mine(duel(1)))).toBe('dash.line.funded');
  });
});

describe('goKey', () => {
  it('reports the result of a match, answers a request, and only opens a duel waiting on someone else', () => {
    expect([goKey(mine(duel(1))), goKey(mine(claimed(2, THEM, 60))), goKey(mine(claimed(3, ME, 60)))]).toEqual([
      'dash.go.report',
      'dash.go.answer',
      'dash.go.open',
    ]);
  });
});

describe('myDuels', () => {
  it('files the duels on by whose move it is and the finished ones apart', () => {
    const split = myDuels([duel(1), claimed(2, ME, 60), duel(3, { state: DuelState.Resolved, claimedWinner: ME })], ME, NOW, TIMEOUT);

    expect([split.yours, split.theirs, split.past].map((entries) => entries.map((entry) => entry.duel.id))).toEqual([[1], [2], [3]]);
  });

  it('files a reported win whose time to answer ran out with the finished duels', () => {
    const split = myDuels([claimed(4, THEM, TIMEOUT + 1)], ME, NOW, TIMEOUT);

    expect(split.past.map((entry) => [entry.duel.id, entry.phase])).toEqual([[4, 'timeout']]);
  });

  it('puts the clock that runs out first ahead of a request, a match and a duel waiting to be joined', () => {
    const split = myDuels(
      [
        duel(1),
        duel(2, { state: DuelState.MutualCancelRequested, cancelRequestedBy: THEM }),
        claimed(3, THEM, 60),
        claimed(4, THEM, 600),
      ],
      ME,
      NOW,
      TIMEOUT
    );

    expect(split.yours.map((entry) => entry.duel.id)).toEqual([4, 3, 2, 1]);
  });

  it('lists the finished duels newest first', () => {
    const split = myDuels([2, 9, 5].map((id) => duel(id, { state: DuelState.Cancelled })), ME, NOW, TIMEOUT);

    expect(split.past.map((entry) => entry.duel.id)).toEqual([9, 5, 2]);
  });

  it('leaves out a duel the reader has no seat in', () => {
    const split = myDuels([duel(1, { creator: THEM, opponent: '0x2222222222222222222222222222222222222222' })], ME, NOW, TIMEOUT);

    expect([...split.yours, ...split.theirs, ...split.past]).toEqual([]);
  });
});

describe('phaseClock', () => {
  it('is zero while no time to answer has run out', () => {
    expect(phaseClock([duel(1), claimed(2, THEM, 60)], NOW, TIMEOUT)).toBe(0);
  });

  it('is the latest deadline that has passed', () => {
    const duels = [claimed(1, THEM, TIMEOUT + 500), claimed(2, THEM, TIMEOUT + 100)];

    expect(phaseClock(duels, NOW, TIMEOUT)).toBe(NOW - 100);
  });
});

describe('otherOf', () => {
  it('is the player in the other seat', () => {
    expect(otherOf(mine(duel(1)))).toBe(THEM);
  });

  it('is null while the second seat is empty', () => {
    expect(otherOf(mine(duel(1, { state: DuelState.Created, opponent: ZERO_ADDRESS })))).toBeNull();
  });
});

describe('outcomeOf and netOf', () => {
  it('counts a win as the other player\'s stake gained', () => {
    const won = mine(duel(1, { state: DuelState.Resolved, claimedWinner: ME, wagerAmount: 7_000_000n }));

    expect([outcomeOf(won), netOf(won)]).toEqual(['won', 7_000_000n]);
  });

  it('counts a loss as the reader\'s stake lost', () => {
    const lost = mine(duel(1, { state: DuelState.Resolved, claimedWinner: THEM, wagerAmount: 7_000_000n }));

    expect([outcomeOf(lost), netOf(lost)]).toEqual(['lost', -7_000_000n]);
  });

  it('counts a duel that ended without a winner as nothing either way', () => {
    const refunded = mine(duel(1, { state: DuelState.Refunded, wagerAmount: 7_000_000n }));

    expect([outcomeOf(refunded), netOf(refunded)]).toEqual(['none', 0n]);
  });
});

describe('reportedWin', () => {
  it('tells whether the reader reported the win that timed out', () => {
    expect([reportedWin(mine(claimed(1, ME, TIMEOUT + 1))), reportedWin(mine(claimed(2, THEM, TIMEOUT + 1)))]).toEqual([true, false]);
  });
});

describe('lastMoveAt', () => {
  it('is the end, else the reported win, else the making', () => {
    const ended = mine(duel(1, { createdAt: 10n, claimTimestamp: 20n, finalizedAt: 30n }));
    const reported = mine(duel(2, { createdAt: 10n, claimTimestamp: 20n }));
    const made = mine(duel(3, { createdAt: 10n }));

    expect([lastMoveAt(ended), lastMoveAt(reported), lastMoveAt(made)]).toEqual([30n, 20n, 10n]);
  });
});

describe('myTotals', () => {
  it('counts wins and losses', () => {
    const totals = myTotals([
      mine(duel(1, { state: DuelState.Resolved, claimedWinner: ME })),
      mine(duel(2, { state: DuelState.Resolved, claimedWinner: THEM })),
      mine(duel(3, { state: DuelState.Resolved, claimedWinner: THEM })),
    ]);

    expect([totals.wins, totals.losses]).toEqual([1, 2]);
  });

  it('counts the stakes of duels on and decided, not of those whose stakes came back', () => {
    const totals = myTotals([
      mine(duel(1, { wagerAmount: 1_000_000n })),
      mine(duel(2, { state: DuelState.Resolved, claimedWinner: ME, wagerAmount: 2_000_000n })),
      mine(duel(3, { state: DuelState.Refunded, wagerAmount: 4_000_000n })),
      mine(duel(4, { state: DuelState.MutuallyCancelled, wagerAmount: 8_000_000n })),
    ]);

    expect(totals.stakedRaw).toBe(3_000_000n);
  });

  it('counts what the reader took out, from their own seat', () => {
    const totals = myTotals([
      mine(duel(1, { state: DuelState.Resolved, claimedWinner: ME, creatorPayout: 10_000_000n, creatorClaimed: true })),
      mine(duel(2, { state: DuelState.Refunded, creatorPayout: 5_000_000n, creatorClaimed: false })),
      mine(duel(3, { state: DuelState.Resolved, claimedWinner: THEM, opponentPayout: 6_000_000n, opponentClaimed: true })),
    ]);

    expect(totals.takenRaw).toBe(10_000_000n);
  });
});
