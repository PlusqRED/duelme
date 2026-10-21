import { describe, expect, it, vi } from 'vitest';
import { fundingWrite, resolveNeedsApproval, resolveWriteRoute } from '@/lib/writeRoute';

const DUEL_ME = '0x588A54Fa8c00c8aC003e41BD8ee26FBC8994105f';
const TOKEN = '0x44d213D601C19ec98Bf61A1bCa3935D6da07F05D';

describe('resolveWriteRoute', () => {
  it('testResolveWriteRouteRelaysADuelCallWhileRelayingIsOn', () => {
    const route = resolveWriteRoute({ isRelayEnabled: true, target: DUEL_ME, contractAddress: DUEL_ME, functionName: 'claimVictory' });

    expect(route).toBe('relay');
  });

  it('testResolveWriteRouteLeavesEveryWriteToTheWalletWhileRelayingIsOff', () => {
    const route = resolveWriteRoute({ isRelayEnabled: false, target: DUEL_ME, contractAddress: DUEL_ME, functionName: 'claimVictory' });

    expect(route).toBe('self');
  });

  it('testResolveWriteRouteKeepsATokenApproveSelfPaid', () => {
    const route = resolveWriteRoute({ isRelayEnabled: true, target: TOKEN, contractAddress: DUEL_ME, functionName: 'approve' });

    expect(route).toBe('self');
  });

  it('testResolveWriteRouteKeepsACallTheRelayRefusesSelfPaid', () => {
    const route = resolveWriteRoute({ isRelayEnabled: true, target: DUEL_ME, contractAddress: DUEL_ME, functionName: 'pause' });

    expect(route).toBe('self');
  });

  it('testResolveWriteRouteMatchesTheContractWhateverTheCase', () => {
    const route = resolveWriteRoute({
      isRelayEnabled: true,
      target: DUEL_ME.toLowerCase(),
      contractAddress: DUEL_ME,
      functionName: 'cancelDuel',
    });

    expect(route).toBe('relay');
  });
});

describe('fundingWrite', () => {
  it('testFundingWriteTakesThePermitVariantWhenRelayed', () => {
    const write = fundingWrite('joinDuel', true, DUEL_ME);

    expect(write).toEqual({ functionName: 'joinDuelWithPermit', route: 'relay' });
  });

  it('testFundingWriteTakesThePlainCallWhenSelfPaid', () => {
    const write = fundingWrite('createDuel', false, DUEL_ME);

    expect(write).toEqual({ functionName: 'createDuel', route: 'self' });
  });
});

describe('resolveNeedsApproval', () => {
  it('testResolveNeedsApprovalNeverReadsTheAllowanceForAPermit', async () => {
    const readLatestAllowance = vi.fn(async () => 0n);

    const needs = await resolveNeedsApproval({ fundsViaPermit: true, readLatestAllowance, rawAmount: 100n });

    expect(needs).toBe(false);
    expect(readLatestAllowance).not.toHaveBeenCalled();
  });

  it('testResolveNeedsApprovalAsksForAnApproveWhileTheAllowanceIsShort', async () => {
    const needs = await resolveNeedsApproval({ fundsViaPermit: false, readLatestAllowance: async () => 99n, rawAmount: 100n });

    expect(needs).toBe(true);
  });

  it('testResolveNeedsApprovalSkipsTheApproveOnceTheAllowanceCoversTheStake', async () => {
    const needs = await resolveNeedsApproval({ fundsViaPermit: false, readLatestAllowance: async () => 100n, rawAmount: 100n });

    expect(needs).toBe(false);
  });

  it('testResolveNeedsApprovalAsksForAnApproveWhenTheAllowanceIsUnknown', async () => {
    const needs = await resolveNeedsApproval({ fundsViaPermit: false, readLatestAllowance: async () => undefined, rawAmount: 100n });

    expect(needs).toBe(true);
  });
});
