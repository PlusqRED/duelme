import { describe, expect, it } from 'vitest';
import type { ActionFlowConfig, ActionFlowSummaryContext } from '@/lib/actionFlow';
import {
  ACTION_COPY,
  actionCopyParams,
  bareAmount,
  closesTimedOutDuel,
  errorWords,
  signActionOf,
} from '@/lib/signingCopy';

const CONTEXT: ActionFlowSummaryContext = {
  duelId: 7,
  formattedWager: '5 USDT',
  formattedPot: '10 USDT',
  chainName: 'Arbitrum Sepolia',
  opponentDisplay: 'Nova',
  claimedWinnerDisplay: '',
  claimableDisplay: '',
  t: (key) => key,
};

function config(type: ActionFlowConfig['type'], batch?: ActionFlowConfig['batch']): ActionFlowConfig {
  return { type, execute: () => undefined, batch };
}

describe('signActionOf', () => {
  it.each([
    ['claimVictory', 'won'],
    ['admitDefeat', 'lost'],
    ['confirmResult', 'confirm'],
    ['disputeResult', 'dispute'],
    ['requestMutualCancellation', 'callOff'],
    ['withdrawMutualCancellation', 'withdraw'],
    ['acceptMutualCancellation', 'agree'],
    ['declineMutualCancellation', 'keepPlaying'],
    ['declineDuel', 'decline'],
    ['cancelDuel', 'cancel'],
    ['refundAndClaim', 'takeBack'],
    ['refundAndClaimAll', 'collect'],
  ] as const)('testSignActionOfNames %s', (type, action) => {
    expect(signActionOf(config(type))).toBe(action);
  });

  it('testSignActionOfCallsTheWinningsWhatTheMoveSaysWasWon', () => {
    const action = signActionOf({ ...config('claimPayout'), isWinnings: true });

    expect(action).toBe('claimWin');
  });

  it('testSignActionOfCallsAnyOtherPayoutAStakeComingBack', () => {
    const action = signActionOf({ ...config('claimPayout'), isWinnings: false });

    expect(action).toBe('takeBack');
  });
});

describe('closesTimedOutDuel', () => {
  it('testClosesTimedOutDuelForARefundWithAPayout', () => {
    expect(closesTimedOutDuel(config('refundAndClaim'))).toBe(true);
  });

  it('testClosesTimedOutDuelForABatchWithATimedOutDuel', () => {
    expect(closesTimedOutDuel(config('refundAndClaimAll', { count: 2, totalDisplay: '5', closesTimedOut: true }))).toBe(true);
  });

  it('testClosesTimedOutDuelNotForABatchOfPayoutsOnly', () => {
    expect(closesTimedOutDuel(config('refundAndClaimAll', { count: 2, totalDisplay: '5', closesTimedOut: false }))).toBe(false);
  });

  it('testClosesTimedOutDuelNotForAPlainPayout', () => {
    expect(closesTimedOutDuel(config('claimPayout'))).toBe(false);
  });
});

describe('actionCopyParams', () => {
  it('testActionCopyParamsStripTheUnit', () => {
    const params = actionCopyParams(CONTEXT, config('cancelDuel'));

    expect(params).toMatchObject({ id: 7, wager: '5', pot: '10', other: 'Nova', network: 'Arbitrum Sepolia' });
  });

  it('testActionCopyParamsTakeTheClaimableAsTheAmount', () => {
    const params = actionCopyParams({ ...CONTEXT, claimableDisplay: '7.5 USDT' }, config('claimPayout'));

    expect(params.amount).toBe('7.5');
  });

  it('testActionCopyParamsFallBackToTheWager', () => {
    const params = actionCopyParams(CONTEXT, config('claimPayout'));

    expect(params.amount).toBe('5');
  });

  it('testActionCopyParamsTakeABatchsTotalAndCount', () => {
    const params = actionCopyParams(CONTEXT, config('refundAndClaimAll', { count: 3, totalDisplay: '42 USDT', closesTimedOut: false }));

    expect(params).toMatchObject({ amount: '42', count: 3 });
  });
});

describe('bareAmount', () => {
  it('testBareAmountLeavesANumberAlone', () => {
    expect(bareAmount('12.5')).toBe('12.5');
  });
});

describe('errorWords', () => {
  it('testErrorWordsSayNothingWasSentForATransactionTurnedDown', () => {
    const words = errorWords('rejected', ACTION_COPY.join, true);

    expect(words.title).toBe('sign.err.rejected.self.title');
  });

  it('testErrorWordsSayNothingWasSignedForASignatureTurnedDown', () => {
    const words = errorWords('rejected', ACTION_COPY.join, false);

    expect(words.title).toBe('sign.err.rejected.title');
  });

  it('testErrorWordsLetAMoveWordTheContractsRefusal', () => {
    const words = errorWords('reverted', ACTION_COPY.collect, false);

    expect(words.text).toBe('sign.collect.err.reverted.text');
  });

  it('testErrorWordsShareTheRefusalOtherwise', () => {
    const words = errorWords('reverted', ACTION_COPY.won, false);

    expect(words.text).toBe('sign.err.reverted.text');
  });

  it('testErrorWordsPromiseNothingAboutAReplacement', () => {
    const words = errorWords('replaced', ACTION_COPY.won, true);

    expect(words.isSafe).toBe(false);
  });

  it('testErrorWordsPromiseNothingAfterALostAnswer', () => {
    const words = errorWords('lost', ACTION_COPY.create, false);

    expect(words.isSafe).toBe(false);
  });

  it('testErrorWordsSayTheMoneyStayedOtherwise', () => {
    const words = errorWords('budget', ACTION_COPY.won, false);

    expect(words.isSafe).toBe(true);
  });
});
