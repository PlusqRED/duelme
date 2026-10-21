import { describe, expect, it } from 'vitest';
import { flowError } from '@/lib/flowError';
import { reduceFlow, startFlow, type FlowCore } from '@/lib/flowSession';

type Stage = 'review' | 'switch-network' | 'approve' | 'join-duel' | 'success';

const REJECTED = flowError('rejected');

function at(overrides: Partial<FlowCore<Stage>> = {}): FlowCore<Stage> {
  return { ...startFlow<Stage>('review'), ...overrides };
}

describe('startFlow', () => {
  it('testStartFlowWaitsOnItsFirstStageWithNothingDone', () => {
    const flow = startFlow<Stage>('review');

    expect(flow).toEqual({
      stage: 'review',
      actionState: 'idle',
      errorMessage: null,
      pendingTransaction: null,
      completedSteps: { switchNetwork: false, approve: false },
      failedWhile: null,
      feePaidWei: 0n,
    });
  });
});

describe('reduceFlow', () => {
  it('testReduceFlowMovesToAStepThatWaitsForThePlayer', () => {
    const flow = reduceFlow(at({ actionState: 'error', errorMessage: REJECTED }), { type: 'moved', stage: 'approve' });

    expect(flow).toMatchObject({ stage: 'approve', actionState: 'idle', errorMessage: null, failedWhile: null });
  });

  it('testReduceFlowAsksTheWalletToSwitch', () => {
    const flow = reduceFlow(at(), { type: 'switching', stage: 'switch-network' });

    expect(flow).toMatchObject({ stage: 'switch-network', actionState: 'awaiting-wallet' });
  });

  it('testReduceFlowMarksTheSwitchDoneAndGoesOn', () => {
    const flow = reduceFlow(at({ stage: 'switch-network', actionState: 'awaiting-wallet' }), { type: 'switched', next: 'join-duel' });

    expect(flow).toMatchObject({ stage: 'join-duel', actionState: 'idle', completedSteps: { switchNetwork: true, approve: false } });
  });

  it('testReduceFlowHoldsTheStepBusyWhileItPrepares', () => {
    const flow = reduceFlow(at({ stage: 'join-duel', actionState: 'error', errorMessage: REJECTED }), { type: 'preparing' });

    expect(flow).toMatchObject({ stage: 'join-duel', actionState: 'awaiting-wallet', errorMessage: null, pendingTransaction: null });
  });

  it('testReduceFlowStartsAWriteInTheWallet', () => {
    const flow = reduceFlow(at(), { type: 'writing', step: 'join-duel' });

    expect(flow).toMatchObject({ stage: 'join-duel', actionState: 'awaiting-wallet', pendingTransaction: 'join-duel' });
  });

  it('testReduceFlowFollowsAWriteOntoTheNetwork', () => {
    const flow = reduceFlow(at({ stage: 'join-duel', actionState: 'awaiting-wallet', pendingTransaction: 'join-duel' }), {
      type: 'progressed',
      actionState: 'confirming',
    });

    expect(flow.actionState).toBe('confirming');
  });

  it('testReduceFlowReturnsTheSameFlowForProgressItAlreadyShows', () => {
    const before = at({ stage: 'join-duel', actionState: 'confirming', pendingTransaction: 'join-duel' });

    const after = reduceFlow(before, { type: 'progressed', actionState: 'confirming' });

    expect(after).toBe(before);
  });

  it('testReduceFlowIgnoresProgressWithNoWriteInFlight', () => {
    const before = at();

    const after = reduceFlow(before, { type: 'progressed', actionState: 'confirming' });

    expect(after).toBe(before);
  });

  it('testReduceFlowRemembersAFailureInTheWallet', () => {
    const flow = reduceFlow(at({ stage: 'join-duel', actionState: 'awaiting-wallet', pendingTransaction: 'join-duel' }), {
      type: 'failed',
      error: REJECTED,
      step: 'join-duel',
    });

    expect(flow).toMatchObject({
      stage: 'join-duel',
      actionState: 'error',
      errorMessage: REJECTED,
      pendingTransaction: null,
      failedWhile: 'awaiting-wallet',
    });
  });

  it('testReduceFlowRemembersAFailureOnTheNetwork', () => {
    const flow = reduceFlow(at({ stage: 'join-duel', actionState: 'confirming', pendingTransaction: 'join-duel' }), {
      type: 'failed',
      error: flowError('reverted'),
      step: 'join-duel',
    });

    expect(flow.failedWhile).toBe('confirming');
  });

  it('testReduceFlowDropsAFailureOfAWriteNoLongerInFlight', () => {
    const before = at({ stage: 'join-duel', pendingTransaction: null });

    const after = reduceFlow(before, { type: 'failed', error: REJECTED, step: 'join-duel' });

    expect(after).toBe(before);
  });

  it('testReduceFlowStopsAStepThatFailedOutsideAWrite', () => {
    const flow = reduceFlow(at({ stage: 'switch-network', actionState: 'awaiting-wallet' }), { type: 'failed', error: flowError('network') });

    expect(flow).toMatchObject({ actionState: 'error', failedWhile: 'awaiting-wallet' });
  });

  it('testReduceFlowGoesOnAfterAnApproveAndCountsItsFee', () => {
    const flow = reduceFlow(at({ stage: 'approve', actionState: 'confirming', pendingTransaction: 'approve' }), {
      type: 'wrote',
      step: 'approve',
      next: 'join-duel',
      feeWei: 900n,
    });

    expect(flow).toMatchObject({
      stage: 'join-duel',
      actionState: 'idle',
      pendingTransaction: null,
      completedSteps: { switchNetwork: false, approve: true },
      feePaidWei: 900n,
    });
  });

  it('testReduceFlowAddsTheMovesFeeToTheApproves', () => {
    const flow = reduceFlow(at({ stage: 'join-duel', pendingTransaction: 'join-duel', feePaidWei: 900n }), {
      type: 'wrote',
      step: 'join-duel',
      next: 'success',
      feeWei: 2_100n,
    });

    expect(flow).toMatchObject({ stage: 'success', feePaidWei: 3_000n });
  });

  it('testReduceFlowDropsASuccessOfAWriteNoLongerInFlight', () => {
    const before = at({ stage: 'review' });

    const after = reduceFlow(before, { type: 'wrote', step: 'join-duel', next: 'success', feeWei: 0n });

    expect(after).toBe(before);
  });

  it('testReduceFlowKeepsTheFlowsOwnData', () => {
    const flow = reduceFlow({ ...at(), draft: { duelId: 7n } }, { type: 'moved', stage: 'approve' });

    expect(flow.draft).toEqual({ duelId: 7n });
  });
});
