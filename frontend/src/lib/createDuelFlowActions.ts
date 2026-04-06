import { parseUnits } from 'viem';
import type { Dispatch, SetStateAction } from 'react';
import type { useAppToast } from '@/hooks/useAppToast';
import type { useTranslation } from '@/i18n/useTranslation';
import {
  type CreateDuelFlowSession,
  getCreateDuelFlowStageAfterNetwork,
  getNextCreateDuelFlowStageFromReview,
} from '@/lib/createDuelFlow';
import { USDT_DECIMALS } from '@/lib/constants';
import { getCreateDuelFlowErrorMessage } from '@/lib/createDuelFlowRuntime';
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
  createDuel: (
    amount: bigint,
    inviteHash: `0x${string}`,
    message?: string
  ) => void;
  currentAllowance: bigint | undefined;
  gameName: string;
  isPublic: boolean;
  isValidAmount: boolean;
  isValidMessage: boolean;
  login: () => void;
  message: string;
  ready: boolean;
  reset: () => void;
  setFlow: Dispatch<SetStateAction<CreateDuelFlowSession | null>>;
  setRedirectTarget: Dispatch<SetStateAction<string | null>>;
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>;
  t: ReturnType<typeof useTranslation>['t'];
  tokenAddress: `0x${string}`;
  approveToken: (token: `0x${string}`, amount: bigint) => void;
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
  currentAllowance,
  gameName,
  isPublic,
  isValidAmount,
  isValidMessage,
  login,
  message,
  ready,
  reset,
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
      appToast.error('create.min');
      return;
    }

    if (!isValidMessage) {
      appToast.error('create.messageTooLong');
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
      stage: 'review',
      actionState: 'idle',
      errorMessage: null,
      pendingTransaction: null,
    });
  }

  function handleContinueFlow() {
    setFlow((current) =>
      !current
        ? current
        : {
            ...current,
            stage: getNextCreateDuelFlowStageFromReview({
              needsNetworkSwitch: connectedChainId !== current.draft.chainId,
              needsApproval:
                currentAllowance === undefined || currentAllowance < current.draft.rawAmount,
            }),
            actionState: 'idle',
            errorMessage: null,
          }
    );
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
      setFlow((current) =>
        !current
          ? current
          : {
              ...current,
              stage: getCreateDuelFlowStageAfterNetwork({
                needsApproval:
                  currentAllowance === undefined ||
                  currentAllowance < current.draft.rawAmount,
              }),
              actionState: 'idle',
              errorMessage: null,
            }
      );
    } catch (switchError) {
      setFlow((current) =>
        !current
          ? current
          : {
              ...current,
              actionState: 'error',
              errorMessage: getCreateDuelFlowErrorMessage(
                switchError,
                t,
                current.draft.chainName,
                'create.flow.error.switch'
              ),
            }
      );
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

    startContractStep('approve', () =>
      approveToken(flow.draft.usdtAddress, flow.draft.rawAmount)
    );
  }

  function handleCreateTransaction(flow: CreateDuelFlowSession | null) {
    if (!flow) {
      return;
    }

    if (connectedChainId !== flow.draft.chainId) {
      moveToIdleStep('switch-network');
      return;
    }

    if (currentAllowance !== undefined && currentAllowance < flow.draft.rawAmount) {
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
    run: () => void
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
      run();
    } catch (flowError) {
      reset();
      setFlow((current) =>
        !current
          ? current
          : {
              ...current,
              actionState: 'error',
              errorMessage: getCreateDuelFlowErrorMessage(
                flowError,
                t,
                current.draft.chainName
              ),
              pendingTransaction: null,
            }
      );
    }
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
