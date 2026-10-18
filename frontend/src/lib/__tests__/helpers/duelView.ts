import { ZERO_ADDRESS } from '@/lib/constants';
import { DuelState, type Duel } from '@/lib/contracts';

/**
 * A full `Duel` as `getDuel` decodes it: a duel waiting for an opponent, with the fields a test
 * cares about overridden. One place to add a field when the struct grows.
 *
 * Not named `*.test.ts`, so vitest's `include` glob does not collect it.
 */
export function duelView(overrides: Partial<Duel> = {}): Duel {
  return {
    creator: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
    opponent: ZERO_ADDRESS,
    invitedOpponent: ZERO_ADDRESS,
    wagerAmount: 5_000_000n,
    inviteHash: ZERO_ADDRESS,
    message: '',
    claimedWinner: ZERO_ADDRESS,
    claimedBy: ZERO_ADDRESS,
    cancelRequestedBy: ZERO_ADDRESS,
    createdAt: 1n,
    fundedAt: 0n,
    cancelRequestedAt: 0n,
    claimTimestamp: 0n,
    finalizedAt: 0n,
    creatorPayout: 0n,
    opponentPayout: 0n,
    creatorClaimed: false,
    opponentClaimed: false,
    state: DuelState.Created,
    ...overrides,
  };
}
