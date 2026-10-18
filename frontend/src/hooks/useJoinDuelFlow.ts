'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { notifyManager } from '@tanstack/react-query';
import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { useAppToast } from '@/hooks/useAppToast';
import { useJoinDuelFlowLifecycle } from '@/hooks/useJoinDuelFlowLifecycle';
import { useDuelActions } from '@/hooks/useDuelActions';
import { type FlowReviewGate, useFlowFunding } from '@/hooks/useFlowFunding';
import { useTranslation } from '@/i18n/useTranslation';
import { joinDuelFlowActions } from '@/lib/joinDuelFlowActions';
import type { JoinDuelFlowSession } from '@/lib/joinDuelFlow';
import { DUELME_ADDRESSES, DEFAULT_CHAIN } from '@/lib/constants';
import { erc20Abi, type Duel } from '@/lib/contracts';
import { canJoinWaitingDuel } from '@/lib/duel';
import { useActiveWallet } from '@/hooks/useActiveWallet';

interface UseJoinDuelFlowArgs {
  duelId: number;
  duel: Duel | undefined;
  inviteSecret: `0x${string}` | null;
  refetchDuel: () => Promise<unknown>;
}

export function useJoinDuelFlow({
  duelId,
  duel,
  inviteSecret,
  refetchDuel,
}: UseJoinDuelFlowArgs) {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const [flow, setFlow] = useState<JoinDuelFlowSession | null>(null);
  const [allowanceRefreshCount, setAllowanceRefreshCount] = useState(0);
  const [duelRecheckCount, setDuelRecheckCount] = useState(0);

  const { authenticated } = usePrivy();
  const { walletAddress } = useActiveWallet();
  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();

  const chainConfig = DEFAULT_CHAIN;
  const contractAddress = DUELME_ADDRESSES[chainConfig.id];
  const joinActions = useDuelActions(chainConfig.id);
  // The relayed path funds the wager with an EIP-2612 signature carried inside the duel
  // call, so there is no allowance to top up and no approve step to show.
  const fundsViaPermit = joinActions.isRelayEnabled;

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

  const canJoin = canJoinWaitingDuel({
    duel,
    viewerAddress: walletAddress,
    authenticated,
    inviteSecret,
    contractAddress,
    chainId: chainConfig.id,
  });

  // On opening the flow and back from topping up, the duel may have been joined, cancelled or
  // declined since the page read it (that read is not polled): read it again and keep Continue
  // closed until the answer is in, then re-run the same checks as the page.
  // The count drops through React Query's own scheduler, i.e. after the new duel reached the page —
  // never in a render that still shows the old one. A count, not a flag: a second recheck cancels
  // the first refetch, whose promise then settles while the second is still in flight.
  const recheckDuel = useCallback(() => {
    setDuelRecheckCount((count) => count + 1);
    void refetchDuel().finally(() =>
      notifyManager.schedule(() => setDuelRecheckCount((count) => Math.max(0, count - 1)))
    );
  }, [refetchDuel]);
  const isRecheckingDuel = duelRecheckCount > 0;

  const { funding, markOpened } = useFlowFunding({
    chainId: flow?.draft.chainId ?? chainConfig.id,
    requiredRaw: flow?.draft.rawAmount ?? null,
    isReviewing: flow?.stage === 'review',
    onShowReview: recheckDuel,
  });
  const review: FlowReviewGate = {
    funding,
    // Until the relay probe answers, the flow cannot tell a permit from an approve step.
    canContinue:
      funding.status.kind === 'enough' && canJoin && !isRecheckingDuel && joinActions.isRelayResolved,
    // Only once the wallet is known: while it resolves, canJoin is false for no reason the duel gave.
    blockedReason:
      !canJoin && !isRecheckingDuel && !!walletAddress ? 'deposit.joinUnavailable' : null,
  };

  const actions = joinDuelFlowActions({
    appToast,
    chainId: chainConfig.id,
    chainName: chainConfig.name,
    connectedChainId,
    contractAddress,
    duelId,
    inviteSecret,
    fundsViaPermit,
    joinDuel: joinActions.joinDuel,
    readLatestAllowance,
    reset: joinActions.reset,
    setFlow,
    switchChainAsync,
    t,
    tokenAddress: chainConfig.usdt,
    approveToken: joinActions.approveToken,
    wagerAmount: duel?.wagerAmount ?? 0n,
    creatorAddress: duel?.creator ?? '',
    viewerAddress: walletAddress,
    duelInviteHash: duel?.inviteHash ?? '',
  });

  useJoinDuelFlowLifecycle({
    error: joinActions.error,
    flow,
    isConfirming: joinActions.isConfirming,
    isPending: joinActions.isPending,
    isSuccess: joinActions.isSuccess,
    refetchAllowance: refetchAllowanceIfRelevant,
    refetchDuel,
    reset: joinActions.reset,
    setFlow,
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

  return {
    canCloseFlow,
    canJoin,
    closeFlow: actions.closeFlow,
    flow,
    handleApprove: () => actions.handleApprove(flow),
    handleContinueFlow: () => {
      // The button is disabled too, but the gate is here: nothing past review without a fresh
      // balance that covers the wager and a duel that still takes this player.
      if (!review.canContinue) {
        return;
      }
      void actions.handleContinueFlow(flow);
    },
    handleJoinTransaction: () => actions.handleJoinTransaction(flow),
    handleFlowOpenChange: (open: boolean) => {
      if (!open) {
        actions.closeFlow();
      }
    },
    handleOpenJoinFlow: () => {
      markOpened();
      recheckDuel();
      actions.handleOpenJoinFlow();
    },
    handleSwitchNetwork: () => actions.handleSwitchNetwork(flow),
    needsApproval,
    needsNetworkSwitch,
    review,
  };
}
