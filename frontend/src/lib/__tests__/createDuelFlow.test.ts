import { describe, expect, it } from 'vitest';
import {
  getCreateDuelFlowStageAfterNetwork,
  getCreateDuelFlowSteps,
  getNextCreateDuelFlowStageFromReview,
} from '@/lib/createDuelFlow';

describe('getNextCreateDuelFlowStageFromReview', () => {
  it('starts with network switch when the wallet is on the wrong chain', () => {
    expect(
      getNextCreateDuelFlowStageFromReview({
        needsNetworkSwitch: true,
        needsApproval: true,
      })
    ).toBe('switch-network');
  });

  it('starts with approval when the network is already correct', () => {
    expect(
      getNextCreateDuelFlowStageFromReview({
        needsNetworkSwitch: false,
        needsApproval: true,
      })
    ).toBe('approve');
  });

  it('jumps straight to creation when no prep steps are needed', () => {
    expect(
      getNextCreateDuelFlowStageFromReview({
        needsNetworkSwitch: false,
        needsApproval: false,
      })
    ).toBe('create-duel');
  });
});

describe('getCreateDuelFlowStageAfterNetwork', () => {
  it('goes to approval when allowance is still needed', () => {
    expect(
      getCreateDuelFlowStageAfterNetwork({
        needsApproval: true,
      })
    ).toBe('approve');
  });

  it('goes straight to creation when approval is already set', () => {
    expect(
      getCreateDuelFlowStageAfterNetwork({
        needsApproval: false,
      })
    ).toBe('create-duel');
  });
});

describe('getCreateDuelFlowSteps', () => {
  it('marks optional steps as skipped on review when they are not needed', () => {
    expect(
      getCreateDuelFlowSteps({
        stage: 'review',
        actionState: 'idle',
        needsNetworkSwitch: false,
        needsApproval: false,
      })
    ).toEqual([
      { id: 'review', status: 'active' },
      { id: 'switch-network', status: 'skipped' },
      { id: 'approve', status: 'skipped' },
      { id: 'create-duel', status: 'upcoming' },
      { id: 'success', status: 'upcoming' },
    ]);
  });

  it('marks network switch as completed and approval as active after a successful switch', () => {
    expect(
      getCreateDuelFlowSteps({
        stage: 'approve',
        actionState: 'idle',
        needsNetworkSwitch: true,
        needsApproval: true,
      })
    ).toEqual([
      { id: 'review', status: 'completed' },
      { id: 'switch-network', status: 'completed' },
      { id: 'approve', status: 'active' },
      { id: 'create-duel', status: 'upcoming' },
      { id: 'success', status: 'upcoming' },
    ]);
  });

  it('surfaces errors on the active optional step', () => {
    expect(
      getCreateDuelFlowSteps({
        stage: 'approve',
        actionState: 'error',
        needsNetworkSwitch: false,
        needsApproval: true,
      })
    ).toEqual([
      { id: 'review', status: 'completed' },
      { id: 'switch-network', status: 'skipped' },
      { id: 'approve', status: 'error' },
      { id: 'create-duel', status: 'upcoming' },
      { id: 'success', status: 'upcoming' },
    ]);
  });

  it('marks create as completed once success is reached', () => {
    expect(
      getCreateDuelFlowSteps({
        stage: 'success',
        actionState: 'idle',
        needsNetworkSwitch: true,
        needsApproval: true,
      })
    ).toEqual([
      { id: 'review', status: 'completed' },
      { id: 'switch-network', status: 'completed' },
      { id: 'approve', status: 'completed' },
      { id: 'create-duel', status: 'completed' },
      { id: 'success', status: 'active' },
    ]);
  });
});
