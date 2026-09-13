import { parseUnits } from 'viem';
import type { Dispatch, SetStateAction } from 'react';
import type { useAppToast } from '@/hooks/useAppToast';
import type { TranslationKey } from '@/i18n/translations';
import type { useTranslation } from '@/i18n/useTranslation';
import {
  type CreateDuelFlowSession,
  getCreateDuelFlowStageAfterNetwork,
  getNextCreateDuelFlowStageFromReview,
} from '@/lib/createDuelFlow';
import { USDT_DECIMALS } from '@/lib/constants';
import { getContractConfig } from '@/lib/contractConfig';
import { getGuidedFlowErrorMessage } from '@/lib/guidedFlowRuntime';
import { resolveNeedsApproval } from '@/lib/guidedFlowSteps';
import {
  generateInviteSecret,
  hashInviteSecret,
  PUBLIC_INVITE_HASH,
  PUBLIC_INVITE_SECRET,
} from '@/lib/invite';

interface CreateDuelFlowActionsOptions {
  activeWalletAddress?: string;
  amount: string;
  appToast: ReturnType<typeof useAppToast>;
  authenticated: boolean;
  chainId: number;
  chainName: string;
  connectedChainId?: number;
  contractAddress: `0x${string}`;
  createDuel: (amount: bigint, inviteHash: `0x${string}`, message?: string) => Promise<void> | void;
  /**
   * True when the wager is authorised by an EIP-2612 signature instead of an allowance —
   * the relayed path. The approve step is then not just skipped in the UI: the allowance
   * guard below must not bounce the flow back to it either, because there is no allowance
   * to find and the permit is signed as part of the duel call itself.
   */
  fundsViaPermit: boolean;

  gameName: string;
  isPublic: boolean;
  isValidAmount: boolean;
  isValidMessage: boolean;
  login: () => void;
  message: string;
  ready: boolean;
  reset: () => void;
  readLatestAllowance: () => Promise<bigint | undefined>;
  setFlow: Dispatch<SetStateAction<CreateDuelFlowSession | null>>;
  setRedirectTarget: Dispatch<SetStateAction<string | null>>;
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>;
  t: ReturnType<typeof useTranslation>['t'];
  tokenAddress: `0x${string}`;
  approveToken: (token: `0x${string}`, amount: bigint) => Promise<void> | void;
}

export function createDuelFlowActions({
  activeWalletAddress,
  amount,
  appToast,
  authenticated,
  chainId,
  chainName,
  connectedChainId,
  contractAddress,
  createDuel,
  fundsViaPermit,
  gameName,
  isPublic,
  isValidAmount,
  isValidMessage,
  login,
  message,
  ready,
  reset,
  readLatestAllowance,
  setFlow,
  setRedirectTarget,
  switchChainAsync,
  t,
  tokenAddress,
  approveToken,
}: CreateDuelFlowActionsOptions) {
  function closeFlow() {
    setFlow(null);
    setRedirectTarget(null);
    reset();
  }
  async function handleCreateDuelClick() {
    if (!ready) {
      return;
    }
    if (!authenticated) {
      login();
      return;
    }
    if (!activeWalletAddress) {
      appToast.error('toast.walletNotReady');
      return;
    }
    if (!isValidAmount) {
      appToast.error('create.min', { min: getContractConfig().minWager });
      return;
    }
    if (!isValidMessage) {
      appToast.error('create.messageTooLong', { max: getContractConfig().maxMessageCharacters });
      return;
    }
    const rawAmount = parseUnits(amount, USDT_DECIMALS);
    const inviteSecret = isPublic ? PUBLIC_INVITE_SECRET : generateInviteSecret();
    reset();
    setRedirectTarget(null);
    setFlow({
      draft: {
        rawAmount,
        chainId,
        chainName,
        usdtAddress: tokenAddress,
        contractAddress,
        inviteHash: isPublic ? PUBLIC_INVITE_HASH : hashInviteSecret(inviteSecret),
        inviteSecret: isPublic ? null : inviteSecret,
        isPublic,
        gameName: gameName.trim(),
        message,
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

  async function handleContinueFlow(flow: CreateDuelFlowSession | null) {
    if (!flow) {
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
              stage: getNextCreateDuelFlowStageFromReview({
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

  async function handleSwitchNetwork(flow: CreateDuelFlowSession | null) {
    if (!flow) {
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
              stage: getCreateDuelFlowStageAfterNetwork({ needsApproval }),
              actionState: 'idle',
              errorMessage: null,
            }
      );
    } catch (switchError) {
      setFlowError(switchError, 'create.flow.error.switch');
    }
  }

  function handleApprove(flow: CreateDuelFlowSession | null) {
    if (!flow) {
      return;
    }
    if (connectedChainId !== flow.draft.chainId) {
      moveToIdleStep('switch-network');
      return;
    }
    startContractStep('approve', () => approveToken(flow.draft.usdtAddress, flow.draft.rawAmount));
  }

  async function handleCreateTransaction(flow: CreateDuelFlowSession | null) {
    if (!flow) {
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
    startContractStep('create-duel', () =>
      createDuel(flow.draft.rawAmount, flow.draft.inviteHash, flow.draft.message)
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
    step: 'approve' | 'create-duel',
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
    handleCreateDuelClick,
    handleCreateTransaction,
    handleSwitchNetwork,
  };
}
