'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TransactionReceipt } from 'viem';
import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { useIdentityToken, usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useAppToast } from '@/hooks/useAppToast';
import { useDuelActions } from '@/hooks/useDuelActions';
import { type FlowReviewGate, useFlowFunding } from '@/hooks/useFlowFunding';
import { useFlowLifecycle } from '@/hooks/useFlowLifecycle';
import { emitBalanceRefresh } from '@/lib/balanceRefresh';
import { createDuelFlowActions } from '@/lib/createDuelFlowActions';
import type { CreateDuelFlowSession, CreateDuelFlowStage } from '@/lib/createDuelFlow';
import { buildDuelPath, recordCreatedDuel } from '@/lib/createDuelFlowRuntime';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';
import { erc20Abi } from '@/lib/contracts';
import type { GameCategory } from '@/lib/game';

interface UseCreateDuelFlowArgs {
  amount: string;
  message: string;
  gameName: string;
  /** The game's category, so a game new to the catalog is added under it. */
  gameCategory?: GameCategory | null;
  isPublic: boolean;
  selectedChain: keyof typeof SUPPORTED_CHAINS;
  isValidAmount: boolean;
  isValidMessage: boolean;
  /** Called as the player opens the top-up window, so the form can be kept for the way back. */
  onOpenTopUp?: () => void;
}

export function useCreateDuelFlow({
  amount,
  message,
  gameName,
  gameCategory = null,
  isPublic,
  selectedChain,
  isValidAmount,
  isValidMessage,
  onOpenTopUp,
}: UseCreateDuelFlowArgs) {
  const appToast = useAppToast();
  const [flow, setFlow] = useState<CreateDuelFlowSession | null>(null);
  const [allowanceRefreshCount, setAllowanceRefreshCount] = useState(0);
  // Outlives the window: the page shows the new duel's link once the window is closed.
  const [createdDuelPath, setCreatedDuelPath] = useState<string | null>(null);
  // Left while the chain confirms: 'away' keeps the window out of the way while the flow runs on, so
  // the new duel is still recorded (its invite secret, its game) and its link shown when the receipt
  // lands; 'back' once Create brings it into view again, where it offers its way out at once.
  const [left, setLeft] = useState<'away' | 'back' | null>(null);

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

  // Closing while the wallet or the network still works on it would hide a result that is coming.
  const canCloseFlow = flow?.actionState !== 'awaiting-wallet' && flow?.actionState !== 'confirming';
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
    onOpenTopUp,
  });
  const review: FlowReviewGate = {
    funding,
    canContinue: funding.status.kind === 'enough',
    blockedReason: null,
    signing: {
      phase: duelActions.signingPhase,
      hash: duelActions.hash,
      failedWhile: flow?.failedWhile ?? null,
      feePaidWei: flow?.feePaidWei ?? 0n,
      createdDuelId: flow?.createdDuelId ?? null,
    },
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
    gameCategory,
    isPublic,
    isValidAmount,
    isValidMessage,
    login,
    message,
    ready,
    reset: duelActions.reset,
    readLatestAllowance,
    setFlow,
    switchChainAsync,
    tokenAddress: chainConfig.usdt,
    approveToken: duelActions.approveToken,
  });

  const draft = flow?.draft ?? null;
  const onWritten = useCallback(
    (step: CreateDuelFlowStage, receipt: TransactionReceipt | undefined): CreateDuelFlowStage | null => {
      if (step === 'approve') {
        void refetchAllowanceIfRelevant();
        return 'create-duel';
      }
      // The new duel's id comes from the receipt, so a confirmation without one waits for it.
      if (!receipt || !draft) {
        return null;
      }
      emitBalanceRefresh();
      void refetchAllowanceIfRelevant();
      const createdDuelId = recordCreatedDuel({
        receipt,
        draft,
        identityToken,
        onGameAttachFailed: () => appToast.error('toast.gameAttachFailed'),
      });
      setFlow((current) => current && { ...current, createdDuelId });
      if (createdDuelId !== null) {
        setCreatedDuelPath(buildDuelPath(String(createdDuelId), draft.inviteSecret));
      }
      return 'success';
    },
    [draft, identityToken, appToast, refetchAllowanceIfRelevant]
  );

  useFlowLifecycle<CreateDuelFlowStage, CreateDuelFlowSession>({
    flow,
    setFlow,
    write: duelActions,
    chainId: chainConfig.id,
    paysOwnFees: !fundsViaPermit,
    onWritten,
  });

  // A flow left to finish out of sight ends with the page showing the new duel, so there is no
  // Done to close it on; a failure brings the window back for good, Try again included.
  if (left === 'away' && flow?.stage === 'success') {
    setLeft(null);
    setFlow(null);
  } else if (left !== null && flow?.actionState === 'error') {
    setLeft(null);
  }

  function closeFlow() {
    setLeft(null);
    actions.closeFlow();
  }

  const shouldRefreshReviewAllowance = flow?.stage === 'review';

  useEffect(() => {
    // React Query's refetch() ignores `enabled`, so the gate has to be here too.
    if (!shouldRefreshReviewAllowance || fundsViaPermit) {
      return;
    }

    void readLatestAllowance().catch(() => undefined);
  }, [shouldRefreshReviewAllowance, fundsViaPermit, readLatestAllowance]);

  return {
    authenticated,
    canCloseFlow,
    closeFlow,
    // The page shows the new duel's link itself once the window closes; nothing navigates there.
    createdDuelPath,
    flow,
    isFlowOpen: flow !== null && left !== 'away',
    /** The create runs on behind a closed window: the setup stays as it was sent until it lands. */
    isRunningOutOfSight: flow !== null && left === 'away',
    /** The window was left once and is back: the wait's way out shows without another long wait. */
    wasLeft: left === 'back',
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
      // A create still running out of sight comes back into view; a second one would drop its receipt.
      if (flow !== null) {
        if (left === 'away') {
          setLeft('back');
        }
        return;
      }
      markOpened();
      void actions.handleCreateDuelClick();
    },
    handleCreateTransaction: () => actions.handleCreateTransaction(flow),
    handleFlowOpenChange: (open: boolean) => {
      if (open) {
        return;
      }
      // Only the slow notice's way out closes a window while the chain confirms. The create itself
      // runs on out of sight, to be recorded when it lands; a slow approve simply stops the flow.
      if (flow?.actionState === 'confirming' && flow.pendingTransaction === 'create-duel') {
        setLeft('away');
      } else {
        closeFlow();
      }
    },
    handleSwitchNetwork: () => actions.handleSwitchNetwork(flow),
    needsApproval,
    needsNetworkSwitch,
    review,
  };
}
