import { describe, expect, it } from 'vitest';
import { isBusy, railStatuses, railSteps, signingSpot } from '@/lib/signingSteps';

describe('signingSpot', () => {
  it('testSigningSpotPutsTheReviewOnCheck', () => {
    const spot = signingSpot({ place: 'review', actionState: 'idle', failedWhile: null, route: 'relay' });

    expect(spot).toEqual({ step: 'check', phase: 'idle', failed: false });
  });

  it('testSigningSpotSignsARelayedWriteInTheWallet', () => {
    const spot = signingSpot({ place: 'write', actionState: 'awaiting-wallet', failedWhile: null, route: 'relay' });

    expect(spot).toEqual({ step: 'sign', phase: 'wallet', failed: false });
  });

  it('testSigningSpotSendsARelayedWriteOnceSigned', () => {
    const spot = signingSpot({ place: 'write', actionState: 'confirming', failedWhile: null, route: 'relay' });

    expect(spot).toEqual({ step: 'confirm', phase: 'chain', failed: false });
  });

  it('testSigningSpotKeepsASelfPaidWriteOnOneStep', () => {
    const spot = signingSpot({ place: 'write', actionState: 'confirming', failedWhile: null, route: 'self' });

    expect(spot).toEqual({ step: 'send', phase: 'chain', failed: false });
  });

  it('testSigningSpotFailsARelayedWriteWhereItStopped', () => {
    const spot = signingSpot({ place: 'write', actionState: 'error', failedWhile: 'confirming', route: 'relay' });

    expect(spot).toEqual({ step: 'confirm', phase: 'chain', failed: true });
  });

  it('testSigningSpotFailsASignatureTurnedDownOnSign', () => {
    const spot = signingSpot({ place: 'write', actionState: 'error', failedWhile: 'awaiting-wallet', route: 'relay' });

    expect(spot).toEqual({ step: 'sign', phase: 'wallet', failed: true });
  });

  it('testSigningSpotPutsTheSwitchOnNetwork', () => {
    const spot = signingSpot({ place: 'switch-network', actionState: 'awaiting-wallet', failedWhile: null, route: 'relay' });

    expect(spot).toEqual({ step: 'network', phase: 'wallet', failed: false });
  });

  it('testSigningSpotPutsTheApproveOnAllow', () => {
    const spot = signingSpot({ place: 'approve', actionState: 'idle', failedWhile: null, route: 'self' });

    expect(spot).toEqual({ step: 'approve', phase: 'idle', failed: false });
  });

  it('testSigningSpotEndsOnDone', () => {
    const spot = signingSpot({ place: 'success', actionState: 'idle', failedWhile: null, route: 'self' });

    expect(spot).toEqual({ step: 'done', phase: 'idle', failed: false });
  });
});

describe('railSteps', () => {
  it('testRailStepsSignThenSendOnTheRelay', () => {
    const steps = railSteps({ route: 'relay', showNetwork: false, showApprove: false });

    expect(steps).toEqual(['check', 'sign', 'confirm', 'done']);
  });

  it('testRailStepsAddTheNetworkWhenTheWalletIsElsewhere', () => {
    const steps = railSteps({ route: 'relay', showNetwork: true, showApprove: false });

    expect(steps).toEqual(['check', 'network', 'sign', 'confirm', 'done']);
  });

  it('testRailStepsAllowThenSendWhenTheWalletPays', () => {
    const steps = railSteps({ route: 'self', showNetwork: false, showApprove: true });

    expect(steps).toEqual(['check', 'approve', 'send', 'done']);
  });

  it('testRailStepsNeverAllowOnTheRelay', () => {
    const steps = railSteps({ route: 'relay', showNetwork: false, showApprove: true });

    expect(steps).not.toContain('approve');
  });
});

describe('railStatuses', () => {
  it('testRailStatusesMarkTheStepsBehindDone', () => {
    const steps = railSteps({ route: 'relay', showNetwork: false, showApprove: false });

    const statuses = railStatuses(steps, { step: 'confirm', phase: 'chain', failed: false });

    expect(statuses).toEqual(['done', 'done', 'current', 'next']);
  });

  it('testRailStatusesMarkTheFailedStep', () => {
    const steps = railSteps({ route: 'self', showNetwork: false, showApprove: false });

    const statuses = railStatuses(steps, { step: 'send', phase: 'wallet', failed: true });

    expect(statuses).toEqual(['done', 'error', 'next']);
  });

  it('testRailStatusesFinishOnDone', () => {
    const steps = railSteps({ route: 'self', showNetwork: false, showApprove: false });

    const statuses = railStatuses(steps, { step: 'done', phase: 'idle', failed: false });

    expect(statuses).toEqual(['done', 'done', 'done']);
  });
});

describe('isBusy', () => {
  it('testIsBusyWhileTheWalletIsAsked', () => {
    expect(isBusy({ step: 'sign', phase: 'wallet', failed: false })).toBe(true);
  });

  it('testIsBusyNotOnAFailedStep', () => {
    expect(isBusy({ step: 'confirm', phase: 'chain', failed: true })).toBe(false);
  });

  it('testIsBusyNotOnCheck', () => {
    expect(isBusy({ step: 'check', phase: 'idle', failed: false })).toBe(false);
  });
});
