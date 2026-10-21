import { describe, expect, it } from 'vitest';
import { DuelState } from '@/lib/contracts';
import { getClaimableAmountForAddress, hasClaimed, owedOf, payoutOf } from '@/lib/duel';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa';
const OPPONENT = '0x111111111111111111111111111111111111abcd';

const won = duelView({
  creator: CREATOR,
  opponent: OPPONENT,
  state: DuelState.Resolved,
  creatorPayout: 20_000_000n,
  opponentPayout: 0n,
});

describe('payouts', () => {
  it('testPayoutOfReadsTheSidesShare', () => {
    expect([payoutOf(won, 'creator'), payoutOf(won, 'opponent')]).toEqual([20_000_000n, 0n]);
  });

  it('testOwedOfKeepsAPayoutNotTakenYet', () => {
    expect(owedOf(won, 'creator')).toBe(20_000_000n);
  });

  it('testOwedOfIsNothingOnceTaken', () => {
    const taken = { ...won, creatorClaimed: true };

    expect([hasClaimed(taken, 'creator'), owedOf(taken, 'creator')]).toEqual([true, 0n]);
  });

  it('testGetClaimableAmountForAddressFindsTheSeatWhateverTheCase', () => {
    expect(getClaimableAmountForAddress(won, CREATOR.toLowerCase())).toBe(20_000_000n);
  });

  it('testGetClaimableAmountForAddressGivesAnyoneElseNothing', () => {
    expect([getClaimableAmountForAddress(won, '0x2222222222222222222222222222222222222222'), getClaimableAmountForAddress(won, undefined)]).toEqual([0n, 0n]);
  });
});
