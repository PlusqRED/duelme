import type { Dispatch, SetStateAction } from 'react';
import type { useAppToast } from '@/hooks/useAppToast';
import type { TranslationKey } from '@/i18n/translations';
import type { useTranslation } from '@/i18n/useTranslation';
import {
  type JoinDuelFlowSession,
  getJoinDuelFlowStageAfterNetwork,
  getNextJoinDuelFlowStageFromReview,
} from '@/lib/joinDuelFlow';
import { getGuidedFlowErrorMessage } from '@/lib/guidedFlowRuntime';
import { resolveNeedsApproval } from '@/lib/guidedFlowSteps';
import { hashInviteSecret } from '@/lib/invite';

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
  t: ReturnType<typeof useTranslation>['t'];
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
  t,
  tokenAddress,
  approveToken,
  wagerAmount,
  creatorAddress,
  viewerAddress,
  duelInviteHash,
}: JoinDuelFlowActionsOptions) {

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

    if (!inviteSecret) {
      appToast.error('duel.privateInviteMissing');
      return;
    }

    if (hashInviteSecret(inviteSecret).toLowerCase() !== duelInviteHash.toLowerCase()) {
      appToast.error('duel.privateInviteMissing');
      return;
    }

    reset();
    setFlow({
      draft: {
        duelId: BigInt(duelId),
        rawAmount: wagerAmount,
        chainId,
        chainName,
        usdtAddress: tokenAddress,
        contractAddress,
        inviteSecret,
        creatorAddress,
      },
      completedSteps: {
        switchNetwork: false,
        approve: false,
      },
      stage: 'review',
      actionState: 'idle',
      errorMessage: null,
      pendingTransaction: null,
    });
  }

  async function handleContinueFlow(flow: JoinDuelFlowSession | null) {
    if (!flow) {
      return;
    }
    if (!ensureViewerCanContinue(flow)) {
      return;
    }
    if (connectedChainId !== flow.draft.chainId) {
      moveToIdleStep('switch-network');
      return;
    }
    try {
      const needsApproval = await resolveNeedsApproval({ fundsViaPermit, readLatestAllowance, rawAmount: flow.draft.rawAmount });
      setFlow((current) =>
        !current
          ? current
          : {
              ...current,
              stage: getNextJoinDuelFlowStageFromReview({
                needsNetworkSwitch: false,
                needsApproval,
              }),
              actionState: 'idle',
              errorMessage: null,
            }
      );
    } catch (allowanceError) {
      setFlowError(allowanceError);
    }
  }

  async function handleSwitchNetwork(flow: JoinDuelFlowSession | null) {
    if (!flow) {
      return;
    }
    if (!ensureViewerCanContinue(flow)) {
      return;
    }
    setFlow((current) =>
      current
        ? {
            ...current,
            stage: 'switch-network',
            actionState: 'awaiting-wallet',
            errorMessage: null,
          }
        : current
    );
    try {
      await switchChainAsync({ chainId: flow.draft.chainId });
      const needsApproval = await resolveNeedsApproval({ fundsViaPermit, readLatestAllowance, rawAmount: flow.draft.rawAmount });
      setFlow((current) =>
        !current
          ? current
          : {
              ...current,
              completedSteps: {
                ...current.completedSteps,
                switchNetwork: true,
              },
              stage: getJoinDuelFlowStageAfterNetwork({ needsApproval }),
              actionState: 'idle',
              errorMessage: null,
            }
      );
    } catch (switchError) {
      setFlowError(switchError, 'create.flow.error.switch');
    }
  }

  function handleApprove(flow: JoinDuelFlowSession | null) {
    if (!flow) {
      return;
    }
    if (!ensureViewerCanContinue(flow)) {
      return;
    }
    if (connectedChainId !== flow.draft.chainId) {
      moveToIdleStep('switch-network');
      return;
    }
    startContractStep('approve', () => approveToken(flow.draft.usdtAddress, flow.draft.rawAmount));
  }

  async function handleJoinTransaction(flow: JoinDuelFlowSession | null) {
    if (!flow) {
      return;
    }
    if (!ensureViewerCanContinue(flow)) {
      return;
    }
    if (connectedChainId !== flow.draft.chainId) {
      moveToIdleStep('switch-network');
      return;
    }
    let needsApproval: boolean;
    try {
      needsApproval = await resolveNeedsApproval({ fundsViaPermit, readLatestAllowance, rawAmount: flow.draft.rawAmount });
    } catch (allowanceError) {
      setFlowError(allowanceError);
      return;
    }
    if (needsApproval) {
      moveToIdleStep('approve');
      return;
    }
    startContractStep('join-duel', () =>
      joinDuel(flow.draft.duelId, flow.draft.inviteSecret, flow.draft.rawAmount)
    );
  }

  function moveToIdleStep(step: 'switch-network' | 'approve') {
    setFlow((current) =>
      current
        ? {
            ...current,
            stage: step,
            actionState: 'idle',
            errorMessage: null,
          }
        : current
    );
  }

  function startContractStep(
    step: 'approve' | 'join-duel',
    run: () => Promise<void> | void
  ) {
    reset();
    setFlow((current) =>
      current
        ? {
            ...current,
            stage: step,
            actionState: 'awaiting-wallet',
            errorMessage: null,
            pendingTransaction: step,
          }
        : current
    );
    try {
      const result = run();
      void Promise.resolve(result).catch(handleStartContractStepError);
    } catch (flowError) {
      handleStartContractStepError(flowError);
    }
  }

  function handleStartContractStepError(error: unknown) {
    reset();
    setFlowError(error);
  }

  function isViewerCreator(duelCreatorAddress = creatorAddress) {
    return !!duelCreatorAddress && viewerAddress === duelCreatorAddress.toLowerCase();
  }

  function ensureViewerCanContinue(flow: JoinDuelFlowSession) {
    if (!viewerAddress) {
      setFlowMessageError(t('toast.walletNotReady'));
      return false;
    }

    if (isViewerCreator(flow.draft.creatorAddress)) {
      setFlowMessageError(t('duel.cannotJoinOwnDuel'));
      return false;
    }

    return true;
  }

  function setFlowMessageError(message: string) {
    setFlow((current) =>
      !current
        ? current
        : {
            ...current,
            actionState: 'error',
            errorMessage: message,
            pendingTransaction: null,
          }
    );
  }

  function setFlowError(error: unknown, fallbackKey?: TranslationKey) {
    setFlow((current) =>
      !current
        ? current
        : {
            ...current,
            actionState: 'error',
            errorMessage: getGuidedFlowErrorMessage(
              error,
              t,
              current.draft.chainName,
              fallbackKey
            ),
            pendingTransaction: null,
          }
    );
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
