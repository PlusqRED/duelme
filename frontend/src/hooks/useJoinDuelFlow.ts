'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { useAppToast } from '@/hooks/useAppToast';
import { useJoinDuelFlowLifecycle } from '@/hooks/useJoinDuelFlowLifecycle';
import { useDuelActions } from '@/hooks/useDuelActions';
import { useTranslation } from '@/i18n/useTranslation';
import { joinDuelFlowActions } from '@/lib/joinDuelFlowActions';
import type { JoinDuelFlowSession } from '@/lib/joinDuelFlow';
import { DUELME_ADDRESSES, DEFAULT_CHAIN } from '@/lib/constants';
import { erc20Abi } from '@/lib/contracts';
import { useActiveWallet } from '@/hooks/useActiveWallet';

interface UseJoinDuelFlowArgs {
  duelId: number;
  wagerAmount: bigint;
  inviteSecret: `0x${string}` | null;
  creatorAddress: string;
  duelInviteHash: string;
  refetchDuel: () => void;
}

export function useJoinDuelFlow({
  duelId,
  wagerAmount,
  inviteSecret,
  creatorAddress,
  duelInviteHash,
  refetchDuel,
}: UseJoinDuelFlowArgs) {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const [flow, setFlow] = useState<JoinDuelFlowSession | null>(null);
  const [allowanceRefreshCount, setAllowanceRefreshCount] = useState(0);

  const { walletAddress } = useActiveWallet();
  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();

  const chainConfig = DEFAULT_CHAIN;
  const contractAddress = DUELME_ADDRESSES[chainConfig.id];
  const joinActions = useDuelActions(chainConfig.id);

  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: chainConfig.usdt,
    abi: erc20Abi,
    functionName: 'allowance',
    args: walletAddress && contractAddress ? [walletAddress, contractAddress] : undefined,
    chainId: chainConfig.id,
    query: { enabled: !!walletAddress && !!contractAddress },
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
        ((flow.stage === 'review' && allowanceRefreshCount > 0) ||
          currentAllowance === undefined ||
          currentAllowance < flow.draft.rawAmount)));

  const actions = joinDuelFlowActions({
    appToast,
    chainId: chainConfig.id,
    chainName: chainConfig.name,
    connectedChainId,
    contractAddress,
    duelId,
    inviteSecret,
    joinDuel: joinActions.joinDuel,
    readLatestAllowance,
    reset: joinActions.reset,
    setFlow,
    switchChainAsync,
    t,
    tokenAddress: chainConfig.usdt,
    approveToken: joinActions.approveToken,
    wagerAmount,
    creatorAddress,
    viewerAddress: walletAddress,
    duelInviteHash,
  });

  useJoinDuelFlowLifecycle({
    error: joinActions.error,
    flow,
    isConfirming: joinActions.isConfirming,
    isPending: joinActions.isPending,
    isSuccess: joinActions.isSuccess,
    refetchAllowance,
    refetchDuel,
    reset: joinActions.reset,
    setFlow,
    t,
  });

  const shouldRefreshReviewAllowance = flow?.stage === 'review';

  useEffect(() => {
    if (!shouldRefreshReviewAllowance) {
      return;
    }

    void readLatestAllowance().catch(() => undefined);
  }, [shouldRefreshReviewAllowance, readLatestAllowance]);

  return {
    canCloseFlow,
    closeFlow: actions.closeFlow,
    flow,
    handleApprove: () => actions.handleApprove(flow),
    handleContinueFlow: () => actions.handleContinueFlow(flow),
    handleJoinTransaction: () => actions.handleJoinTransaction(flow),
    handleFlowOpenChange: (open: boolean) => {
      if (!open) {
        actions.closeFlow();
      }
    },
    handleOpenJoinFlow: actions.handleOpenJoinFlow,
    handleSwitchNetwork: () => actions.handleSwitchNetwork(flow),
    needsApproval,
    needsNetworkSwitch,
  };
}
