'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { useIdentityToken, usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useAppToast } from '@/hooks/useAppToast';
import { useCreateDuelFlowLifecycle } from '@/hooks/useCreateDuelFlowLifecycle';
import { useDuelActions } from '@/hooks/useDuelActions';
import { type FlowReviewGate, useFlowFunding } from '@/hooks/useFlowFunding';
import { useTranslation } from '@/i18n/useTranslation';
import { createDuelFlowActions } from '@/lib/createDuelFlowActions';
import type { CreateDuelFlowSession } from '@/lib/createDuelFlow';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';
import { erc20Abi } from '@/lib/contracts';

interface UseCreateDuelFlowArgs {
  amount: string;
  message: string;
  gameName: string;
  isPublic: boolean;
  selectedChain: keyof typeof SUPPORTED_CHAINS;
  isValidAmount: boolean;
  isValidMessage: boolean;
  /** Called as the player opens the top-up panel, so the form can be kept for the way back. */
  onOpenDeposit?: () => void;
}

export function useCreateDuelFlow({
  amount,
  message,
  gameName,
  isPublic,
  selectedChain,
  isValidAmount,
  isValidMessage,
  onOpenDeposit,
}: UseCreateDuelFlowArgs) {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const router = useRouter();
  const [flow, setFlow] = useState<CreateDuelFlowSession | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const [allowanceRefreshCount, setAllowanceRefreshCount] = useState(0);

  const { ready, authenticated, login } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { activeWallet, walletAddress } = useActiveWallet();
  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();

  const chainConfig = SUPPORTED_CHAINS[selectedChain];
  const contractAddress = DUELME_ADDRESSES[chainConfig.id];
  const duelActions = useDuelActions(chainConfig.id);
  // The relayed path funds the wager with an EIP-2612 signature carried inside the duel
  // call, so there is no allowance to top up and no approve step to show.
  const fundsViaPermit = duelActions.isRelayEnabled;
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: chainConfig.usdt,
    abi: erc20Abi,
    functionName: 'allowance',
    args: walletAddress && contractAddress ? [walletAddress, contractAddress] : undefined,
    chainId: chainConfig.id,
    query: { enabled: !fundsViaPermit && !!walletAddress && !!contractAddress },
  });
  const readLatestAllowance = useCallback(async () => {
    setAllowanceRefreshCount((count) => count + 1);

    try {
      const result = await refetchAllowance();

      if (result.error) {
        throw result.error;
      }

      return result.data;
    } finally {
      setAllowanceRefreshCount((count) => Math.max(0, count - 1));
    }
  }, [refetchAllowance]);

  const refetchAllowanceIfRelevant = useCallback(async () => {
    if (fundsViaPermit) {
      return;
    }

    await refetchAllowance();
  }, [fundsViaPermit, refetchAllowance]);

  const canCloseFlow =
    flow?.actionState !== 'awaiting-wallet' &&
    flow?.actionState !== 'confirming' &&
    flow?.stage !== 'success';
  const needsNetworkSwitch =
    flow !== null &&
    (flow.stage === 'switch-network' ||
      (flow.stage === 'review' && connectedChainId !== flow.draft.chainId));
  const needsApproval =
    !fundsViaPermit &&
    flow !== null &&
    (flow.stage === 'approve' ||
      ((flow.stage === 'review' || flow.stage === 'switch-network') &&
        ((flow.stage === 'review' && allowanceRefreshCount > 0) ||
          currentAllowance === undefined ||
          currentAllowance < flow.draft.rawAmount)));

  const { funding, markOpened } = useFlowFunding({
    chainId: flow?.draft.chainId ?? chainConfig.id,
    requiredRaw: flow?.draft.rawAmount ?? null,
    isReviewing: flow?.stage === 'review',
    onShowDeposit: onOpenDeposit,
  });
  const review: FlowReviewGate = {
    funding,
    canContinue: funding.status.kind === 'enough',
    blockedReason: null,
  };

  const actions = createDuelFlowActions({
    activeWalletAddress: activeWallet?.address,
    amount,
    appToast,
    authenticated,
    chainId: chainConfig.id,
    chainName: chainConfig.name,
    connectedChainId,
    contractAddress,
    createDuel: duelActions.createDuel,
    fundsViaPermit,
    gameName,
    isPublic,
    isValidAmount,
    isValidMessage,
    login,
    message,
    ready,
    reset: duelActions.reset,
    readLatestAllowance,
    setFlow,
    setRedirectTarget,
    switchChainAsync,
    t,
    tokenAddress: chainConfig.usdt,
    approveToken: duelActions.approveToken,
  });

  useCreateDuelFlowLifecycle({
    appToast,
    error: duelActions.error,
    flow,
    identityToken,
    isConfirming: duelActions.isConfirming,
    isPending: duelActions.isPending,
    isSuccess: duelActions.isSuccess,
    receipt: duelActions.receipt,
    refetchAllowance: refetchAllowanceIfRelevant,
    reset: duelActions.reset,
    setFlow,
    setRedirectTarget,
    t,
  });

  const shouldRefreshReviewAllowance = flow?.stage === 'review';

  useEffect(() => {
    // React Query's refetch() ignores `enabled`, so the gate has to be here too.
    if (!shouldRefreshReviewAllowance || fundsViaPermit) {
      return;
    }

    void readLatestAllowance().catch(() => undefined);
  }, [shouldRefreshReviewAllowance, fundsViaPermit, readLatestAllowance]);

  useEffect(() => {
    if (!redirectTarget) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push(redirectTarget);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [redirectTarget, router]);

  return {
    authenticated,
    canCloseFlow,
    closeFlow: actions.closeFlow,
    flow,
    handleApprove: () => actions.handleApprove(flow),
    handleContinueFlow: () => {
      // The button is disabled too, but the gate is here: nothing past review without a fresh
      // balance that covers the wager.
      if (!review.canContinue) {
        return;
      }
      void actions.handleContinueFlow(flow);
    },
    handleCreateDuelClick: () => {
      markOpened();
      void actions.handleCreateDuelClick();
    },
    handleCreateTransaction: () => actions.handleCreateTransaction(flow),
    handleFlowOpenChange: (open: boolean) => {
      if (!open) {
        actions.closeFlow();
      }
    },
    handleSwitchNetwork: () => actions.handleSwitchNetwork(flow),
    needsApproval,
    needsNetworkSwitch,
    review,
    submitDisabled: flow !== null || (authenticated && (!isValidAmount || !isValidMessage)),
  };
}
