'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { useIdentityToken, usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useAppToast } from '@/hooks/useAppToast';
import { useCreateDuelFlowLifecycle } from '@/hooks/useCreateDuelFlowLifecycle';
import { useDuelActions } from '@/hooks/useDuelActions';
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
}

export function useCreateDuelFlow({
  amount,
  message,
  gameName,
  isPublic,
  selectedChain,
  isValidAmount,
  isValidMessage,
}: UseCreateDuelFlowArgs) {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const router = useRouter();
  const [flow, setFlow] = useState<CreateDuelFlowSession | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  const { ready, authenticated, login } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { activeWallet, walletAddress } = useActiveWallet();
  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();

  const chainConfig = SUPPORTED_CHAINS[selectedChain];
  const contractAddress = DUELME_ADDRESSES[chainConfig.id];
  const duelActions = useDuelActions(chainConfig.id);
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: chainConfig.usdt,
    abi: erc20Abi,
    functionName: 'allowance',
    args: walletAddress && contractAddress ? [walletAddress, contractAddress] : undefined,
    chainId: chainConfig.id,
    query: { enabled: !!walletAddress && !!contractAddress },
  });

  const canCloseFlow =
    flow?.actionState !== 'awaiting-wallet' &&
    flow?.actionState !== 'confirming' &&
    flow?.stage !== 'success';
  const needsNetworkSwitch =
    flow !== null &&
    (flow.stage === 'switch-network' ||
      (flow.stage === 'review' && connectedChainId !== flow.draft.chainId));
  const needsApproval =
    flow !== null &&
    (flow.stage === 'approve' ||
      ((flow.stage === 'review' || flow.stage === 'switch-network') &&
        (currentAllowance === undefined || currentAllowance < flow.draft.rawAmount)));

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
    currentAllowance,
    gameName,
    isPublic,
    isValidAmount,
    isValidMessage,
    login,
    message,
    ready,
    reset: duelActions.reset,
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
    refetchAllowance,
    reset: duelActions.reset,
    setFlow,
    setRedirectTarget,
    t,
  });

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
    handleContinueFlow: actions.handleContinueFlow,
    handleCreateDuelClick: actions.handleCreateDuelClick,
    handleCreateTransaction: () => actions.handleCreateTransaction(flow),
    handleFlowOpenChange: (open: boolean) => {
      if (!open) {
        actions.closeFlow();
      }
    },
    handleSwitchNetwork: () => actions.handleSwitchNetwork(flow),
    needsApproval,
    needsNetworkSwitch,
    submitDisabled: flow !== null || (authenticated && (!isValidAmount || !isValidMessage)),
  };
}
