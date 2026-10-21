import type { Dispatch, SetStateAction } from 'react';
import type { useAppToast } from '@/hooks/useAppToast';
import { classifyFlowError, flowError, type FlowError } from '@/lib/flowError';
import { reduceFlow, startFlow, type FlowEvent } from '@/lib/flowSession';
import { joinStageAfterChecks, type JoinDuelFlowSession, type JoinDuelFlowStage } from '@/lib/joinDuelFlow';
import { canPresentInvite, OPEN_DUEL_INVITE_SECRET } from '@/lib/invite';
import { resolveNeedsApproval } from '@/lib/writeRoute';

interface JoinDuelFlowActionsOptions {
  appToast: ReturnType<typeof useAppToast>;
  chainId: number;
  chainName: string;
  connectedChainId?: number;
  contractAddress: `0x${string}`;
  duelId: number;
  inviteSecret: `0x${string}` | null;
  joinDuel: (duelId: bigint, inviteSecret: `0x${string}`, wagerAmount: bigint) => Promise<void> | void;
  /**
   * True when the wager is authorised by an EIP-2612 signature instead of an allowance —
   * the relayed path. The approve step is then not just skipped in the UI: the allowance
   * guard below must not bounce the flow back to it either, because there is no allowance
   * to find and the permit is signed as part of the duel call itself.
   */
  fundsViaPermit: boolean;

  readLatestAllowance: () => Promise<bigint | undefined>;
  reset: () => void;
  setFlow: Dispatch<SetStateAction<JoinDuelFlowSession | null>>;
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>;
  tokenAddress: `0x${string}`;
  approveToken: (token: `0x${string}`, amount: bigint) => Promise<void> | void;
  wagerAmount: bigint;
  creatorAddress: string;
  viewerAddress?: `0x${string}`;
  duelInviteHash: string;
}

export function joinDuelFlowActions({
  appToast,
  chainId,
  chainName,
  connectedChainId,
  contractAddress,
  duelId,
  inviteSecret,
  fundsViaPermit,
  joinDuel,
  readLatestAllowance,
  reset,
  setFlow,
  switchChainAsync,
  tokenAddress,
  approveToken,
  wagerAmount,
  creatorAddress,
  viewerAddress,
  duelInviteHash,
}: JoinDuelFlowActionsOptions) {
  function dispatch(event: FlowEvent<JoinDuelFlowStage>) {
    setFlow((current) => current && reduceFlow(current, event));
  }

  function fail(error: FlowError, step?: JoinDuelFlowStage) {
    dispatch({ type: 'failed', error, step });
  }

  function failWith(error: unknown, options: { step?: JoinDuelFlowStage; isNetworkSwitch?: boolean } = {}) {
    fail(classifyFlowError(error, { chainId, isNetworkSwitch: options.isNetworkSwitch }), options.step);
  }

  function closeFlow() {
    setFlow(null);
    reset();
  }

  function handleOpenJoinFlow() {
    if (!viewerAddress) {
      appToast.error('toast.walletNotReady');
      return;
    }

    if (isViewerCreator()) {
      appToast.error('duel.cannotJoinOwnDuel');
      return;
    }

    if (!canPresentInvite(inviteSecret, duelInviteHash, contractAddress, chainId)) {
      appToast.error('duel.privateInviteMissing');
      return;
    }

    reset();
    setFlow({
      ...startFlow<JoinDuelFlowStage>('review'),
      draft: {
        duelId: BigInt(duelId),
        rawAmount: wagerAmount,
        chainId,
        chainName,
        usdtAddress: tokenAddress,
        contractAddress,
        inviteSecret: inviteSecret ?? OPEN_DUEL_INVITE_SECRET,
        creatorAddress,
      },
    });
  }

  function needsApprovalFor(flow: JoinDuelFlowSession) {
    return resolveNeedsApproval({ fundsViaPermit, readLatestAllowance, rawAmount: flow.draft.rawAmount });
  }

  async function handleContinueFlow(flow: JoinDuelFlowSession | null) {
    if (!flow || !ensureViewerCanContinue(flow)) {
      return;
    }
    if (connectedChainId !== flow.draft.chainId) {
      dispatch({ type: 'moved', stage: 'switch-network' });
      return;
    }
    try {
      const needsApproval = await needsApprovalFor(flow);
      dispatch({ type: 'moved', stage: joinStageAfterChecks({ needsNetworkSwitch: false, needsApproval }) });
    } catch (allowanceError) {
      failWith(allowanceError);
    }
  }

  async function handleSwitchNetwork(flow: JoinDuelFlowSession | null) {
    if (!flow || !ensureViewerCanContinue(flow)) {
      return;
    }
    dispatch({ type: 'switching', stage: 'switch-network' });
    try {
      await switchChainAsync({ chainId: flow.draft.chainId });
    } catch (switchError) {
      failWith(switchError, { isNetworkSwitch: true });
      return;
    }
    try {
      const needsApproval = await needsApprovalFor(flow);
      dispatch({ type: 'switched', next: needsApproval ? 'approve' : 'join-duel' });
    } catch (allowanceError) {
      failWith(allowanceError);
    }
  }

  function handleApprove(flow: JoinDuelFlowSession | null) {
    if (!flow || !ensureViewerCanContinue(flow)) {
      return;
    }
    if (connectedChainId !== flow.draft.chainId) {
      dispatch({ type: 'moved', stage: 'switch-network' });
      return;
    }
    startContractStep('approve', () => approveToken(flow.draft.usdtAddress, flow.draft.rawAmount));
  }

  async function handleJoinTransaction(flow: JoinDuelFlowSession | null) {
    if (!flow || !ensureViewerCanContinue(flow)) {
      return;
    }
    if (connectedChainId !== flow.draft.chainId) {
      dispatch({ type: 'moved', stage: 'switch-network' });
      return;
    }
    // The read takes a moment while the button is gone, so a second press cannot send twice.
    dispatch({ type: 'preparing' });
    let needsApproval: boolean;
    try {
      needsApproval = await needsApprovalFor(flow);
    } catch (allowanceError) {
      failWith(allowanceError);
      return;
    }
    if (needsApproval) {
      dispatch({ type: 'moved', stage: 'approve' });
      return;
    }
    startContractStep('join-duel', () =>
      joinDuel(flow.draft.duelId, flow.draft.inviteSecret, flow.draft.rawAmount)
    );
  }

  function startContractStep(step: 'approve' | 'join-duel', run: () => Promise<void> | void) {
    reset();
    dispatch({ type: 'writing', step });
    // A permit refused in the wallet rejects here, before the write hook ever hears of it.
    const failed = (error: unknown) => {
      reset();
      failWith(error, { step });
    };
    try {
      void Promise.resolve(run()).catch(failed);
    } catch (error) {
      failed(error);
    }
  }

  function isViewerCreator(duelCreatorAddress = creatorAddress) {
    return !!duelCreatorAddress && viewerAddress === duelCreatorAddress.toLowerCase();
  }

  function ensureViewerCanContinue(flow: JoinDuelFlowSession) {
    if (!viewerAddress) {
      fail(flowError('walletNotReady'));
      return false;
    }

    if (isViewerCreator(flow.draft.creatorAddress)) {
      fail(flowError('ownDuel'));
      return false;
    }

    return true;
  }

  return {
    closeFlow,
    handleApprove,
    handleContinueFlow,
    handleJoinTransaction,
    handleOpenJoinFlow,
    handleSwitchNetwork,
  };
}
