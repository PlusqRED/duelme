import { describe, expect, it } from 'vitest';
import { createStageAfterChecks } from '@/lib/createDuelFlow';
import { joinStageAfterChecks } from '@/lib/joinDuelFlow';

describe('createStageAfterChecks', () => {
  it('testCreateStageAfterChecksSwitchesTheNetworkFirst', () => {
    expect(createStageAfterChecks({ needsNetworkSwitch: true, needsApproval: true })).toBe('switch-network');
  });

  it('testCreateStageAfterChecksApprovesOnTheRightNetwork', () => {
    expect(createStageAfterChecks({ needsNetworkSwitch: false, needsApproval: true })).toBe('approve');
  });

  it('testCreateStageAfterChecksCreatesWhenNothingIsMissing', () => {
    expect(createStageAfterChecks({ needsNetworkSwitch: false, needsApproval: false })).toBe('create-duel');
  });
});

describe('joinStageAfterChecks', () => {
  it('testJoinStageAfterChecksSwitchesTheNetworkFirst', () => {
    expect(joinStageAfterChecks({ needsNetworkSwitch: true, needsApproval: false })).toBe('switch-network');
  });

  it('testJoinStageAfterChecksApprovesOnTheRightNetwork', () => {
    expect(joinStageAfterChecks({ needsNetworkSwitch: false, needsApproval: true })).toBe('approve');
  });

  it('testJoinStageAfterChecksJoinsWhenNothingIsMissing', () => {
    expect(joinStageAfterChecks({ needsNetworkSwitch: false, needsApproval: false })).toBe('join-duel');
  });
});
