import { describe, expect, it, vi } from 'vitest';
import { flowError } from '@/lib/flowError';
import type { JoinDuelFlowSession } from '@/lib/joinDuelFlow';
import { joinDuelFlowActions } from '@/lib/joinDuelFlowActions';
import { hashInviteSecret } from '@/lib/invite';
import { captureFlowState, mockAppToast } from './helpers/flowHarness';

type JoinDuelFlowActionsOptions = Parameters<typeof joinDuelFlowActions>[0];

const CREATOR = '0x1111111111111111111111111111111111111111' as const;
const VIEWER = '0x2222222222222222222222222222222222222222' as const;
const CONTRACT = '0x3333333333333333333333333333333333333333' as const;
const TOKEN = '0x4444444444444444444444444444444444444444' as const;
const INVITE_SECRET = `0x${'5'.repeat(64)}` as const;
const CHAIN_ID = 421614;
const INVITE_HASH = hashInviteSecret(INVITE_SECRET, CONTRACT, CHAIN_ID);

function setup(overrides: Partial<JoinDuelFlowActionsOptions> = {}) {
  const state = captureFlowState<JoinDuelFlowSession>();
  const appToast = mockAppToast();

  const options: JoinDuelFlowActionsOptions = {
    appToast,
    chainId: CHAIN_ID,
    chainName: 'Arbitrum Sepolia',
    connectedChainId: 421614,
    contractAddress: CONTRACT,
    duelId: 7,
    fundsViaPermit: false,
    inviteSecret: INVITE_SECRET,
    joinDuel: vi.fn(),
    readLatestAllowance: vi.fn(async () => 1000n),
    reset: vi.fn(),
    setFlow: state.setFlow,
    switchChainAsync: vi.fn(async () => undefined),
    tokenAddress: TOKEN,
    approveToken: vi.fn(),
    wagerAmount: 100n,
    creatorAddress: CREATOR,
    viewerAddress: VIEWER,
    duelInviteHash: INVITE_HASH,
    ...overrides,
  };

  return {
    actions: joinDuelFlowActions(options),
    appToast,
    options,
    get flow() {
      return state.flow;
    },
    setFlowDirect(nextFlow: JoinDuelFlowSession | null) {
      state.flow = nextFlow;
    },
  };
}

describe('joinDuelFlowActions', () => {
  it('does not open the join flow for the duel creator', () => {
    const harness = setup({ viewerAddress: CREATOR });

    harness.actions.handleOpenJoinFlow();

    expect(harness.appToast.error).toHaveBeenCalledWith('duel.cannotJoinOwnDuel');
    expect(harness.options.reset).not.toHaveBeenCalled();
    expect(harness.flow).toBeNull();
  });

  it('does not open the join flow before the wallet address is ready', () => {
    const harness = setup({ viewerAddress: undefined });

    harness.actions.handleOpenJoinFlow();

    expect(harness.appToast.error).toHaveBeenCalledWith('toast.walletNotReady');
    expect(harness.options.reset).not.toHaveBeenCalled();
    expect(harness.flow).toBeNull();
  });

  it('blocks the final join step if the active wallet switches to the creator', async () => {
    const initial = setup();
    initial.actions.handleOpenJoinFlow();
    expect(initial.flow).not.toBeNull();

    const switched = setup({ viewerAddress: CREATOR });
    switched.setFlowDirect(initial.flow);

    await switched.actions.handleJoinTransaction(initial.flow);

    expect(switched.options.readLatestAllowance).not.toHaveBeenCalled();
    expect(switched.options.joinDuel).not.toHaveBeenCalled();
    expect(switched.flow?.actionState).toBe('error');
    expect(switched.flow?.errorMessage).toEqual(flowError('ownDuel'));
  });

  it('opens the join flow for a non-creator with a valid invite secret', () => {
    const harness = setup();

    harness.actions.handleOpenJoinFlow();

    expect(harness.appToast.error).not.toHaveBeenCalled();
    expect(harness.options.reset).toHaveBeenCalledOnce();
    expect(harness.flow?.stage).toBe('review');
  });
});

describe('joinDuelFlowActions — permit-funded (relayed) path', () => {
  it('continues straight to the join step instead of asking for an allowance', async () => {
    const harness = setup({ fundsViaPermit: true, readLatestAllowance: vi.fn(async () => 0n) });
    harness.actions.handleOpenJoinFlow();

    await harness.actions.handleContinueFlow(harness.flow);

    expect(harness.options.readLatestAllowance).not.toHaveBeenCalled();
    expect(harness.flow?.stage).toBe('join-duel');
  });

  it('lands on the join step after a network switch rather than the approve step', async () => {
    const harness = setup({
      fundsViaPermit: true,
      connectedChainId: 42161,
      readLatestAllowance: vi.fn(async () => 0n),
    });
    harness.actions.handleOpenJoinFlow();

    await harness.actions.handleSwitchNetwork(harness.flow);

    expect(harness.options.readLatestAllowance).not.toHaveBeenCalled();
    expect(harness.flow?.stage).toBe('join-duel');
  });

  it('still routes a self-paid flow with a short allowance to the approve step', async () => {
    const harness = setup({ readLatestAllowance: vi.fn(async () => 0n) });
    harness.actions.handleOpenJoinFlow();

    await harness.actions.handleContinueFlow(harness.flow);

    expect(harness.options.readLatestAllowance).toHaveBeenCalledOnce();
    expect(harness.flow?.stage).toBe('approve');
  });

  it('sends the wager to joinDuel without reading the allowance', async () => {
    const harness = setup({ fundsViaPermit: true, readLatestAllowance: vi.fn(async () => 0n) });
    harness.actions.handleOpenJoinFlow();

    await harness.actions.handleJoinTransaction(harness.flow);

    // Zero allowance and it still reaches the join step: the permit is the authorisation.
    expect(harness.options.readLatestAllowance).not.toHaveBeenCalled();
    expect(harness.options.joinDuel).toHaveBeenCalledWith(7n, INVITE_SECRET, 100n);
  });
});

describe('joinDuelFlowActions — when a step stops', () => {
  it('testHandleJoinTransactionSaysTheWalletIsNotReadyInsideTheWindow', async () => {
    const opened = setup();
    opened.actions.handleOpenJoinFlow();
    const harness = setup({ viewerAddress: undefined });
    harness.setFlowDirect(opened.flow);

    await harness.actions.handleJoinTransaction(opened.flow);

    expect(harness.flow?.errorMessage).toEqual(flowError('walletNotReady'));
  });

  it('testHandleSwitchNetworkCallsAFailedSwitchTheNetworksFault', async () => {
    const harness = setup({
      connectedChainId: 42161,
      switchChainAsync: vi.fn(async () => {
        throw new Error('User rejected the request.');
      }),
    });
    harness.actions.handleOpenJoinFlow();

    await harness.actions.handleSwitchNetwork(harness.flow);

    expect(harness.flow?.errorMessage?.kind).toBe('network');
    expect(harness.flow?.completedSteps.switchNetwork).toBe(false);
  });

  it('testHandleJoinTransactionTellsAPermitTurnedDownFromAWrite', async () => {
    const harness = setup({
      fundsViaPermit: true,
      joinDuel: vi.fn(async () => {
        throw Object.assign(new Error('User rejected the request.'), { code: 4001 });
      }),
    });
    harness.actions.handleOpenJoinFlow();

    await harness.actions.handleJoinTransaction(harness.flow);
    await Promise.resolve();

    expect(harness.flow).toMatchObject({ actionState: 'error', pendingTransaction: null, failedWhile: 'awaiting-wallet' });
    expect(harness.flow?.errorMessage?.kind).toBe('rejected');
  });

  it('testHandleApproveStartsTheApproveInTheWallet', () => {
    const harness = setup();
    harness.actions.handleOpenJoinFlow();

    harness.actions.handleApprove(harness.flow);

    expect(harness.options.approveToken).toHaveBeenCalledWith(TOKEN, 100n);
    expect(harness.flow).toMatchObject({ stage: 'approve', actionState: 'awaiting-wallet', pendingTransaction: 'approve' });
  });
});
