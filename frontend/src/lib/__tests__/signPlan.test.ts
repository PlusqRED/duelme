import { describe, expect, it } from 'vitest';
import { signPlan } from '@/lib/signPlan';

describe('signPlan', () => {
  it('testSignPlanAsksTwoSignaturesToFundADuelThroughTheRelay', () => {
    const plan = signPlan({ route: 'relay', funds: true, needsApproval: false });

    expect(plan).toEqual([
      { part: 'permit', kind: 'signature' },
      { part: 'move', kind: 'signature' },
    ]);
  });

  it('testSignPlanAsksOneSignatureForARelayedMove', () => {
    const plan = signPlan({ route: 'relay', funds: false, needsApproval: false });

    expect(plan).toEqual([{ part: 'move', kind: 'signature' }]);
  });

  it('testSignPlanNeverAsksForAnApproveOnTheRelay', () => {
    const plan = signPlan({ route: 'relay', funds: true, needsApproval: true });

    expect(plan.map((step) => step.part)).toEqual(['permit', 'move']);
  });

  it('testSignPlanSendsAnApproveBeforeASelfPaidStakeWhileTheAllowanceIsShort', () => {
    const plan = signPlan({ route: 'self', funds: true, needsApproval: true });

    expect(plan).toEqual([
      { part: 'approve', kind: 'transaction' },
      { part: 'move', kind: 'transaction' },
    ]);
  });

  it('testSignPlanSkipsTheApproveOnceTheAllowanceCoversTheStake', () => {
    const plan = signPlan({ route: 'self', funds: true, needsApproval: false });

    expect(plan).toEqual([{ part: 'move', kind: 'transaction' }]);
  });

  it('testSignPlanSendsASelfPaidMoveAsOneTransaction', () => {
    const plan = signPlan({ route: 'self', funds: false, needsApproval: true });

    expect(plan).toEqual([{ part: 'move', kind: 'transaction' }]);
  });
});
