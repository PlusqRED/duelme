'use client';

import { useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useActionFlow } from '@/hooks/useActionFlow';
import { useJoinDuelFlow } from '@/hooks/useJoinDuelFlow';
import { useNicknames } from '@/hooks/useNicknames';
import { useTranslation } from '@/i18n/useTranslation';
import type { ActionFlowSummaryContext } from '@/lib/actionFlow';
import {
  acceptMutualCancellationConfig,
  admitDefeatConfig,
  cancelDuelConfig,
  claimPayoutConfig,
  claimVictoryConfig,
  confirmResultConfig,
  declineDuelConfig,
  declineMutualCancellationConfig,
  disputeResultConfig,
  refundAndClaimConfig,
  requestMutualCancellationConfig,
  withdrawMutualCancellationConfig,
} from '@/lib/actionFlowConfigs';
import { DEFAULT_CHAIN, ZERO_ADDRESS } from '@/lib/constants';
import { DuelState, type Duel } from '@/lib/contracts';
import { getClaimableAmountForAddress } from '@/lib/duel';
import type { DuelPhase } from '@/lib/duelPhase';
import { OPEN_DUEL_INVITE_SECRET } from '@/lib/invite';
import type { TurnActionId } from '@/lib/turnView';
import { formatUSDT } from '@/lib/utils';

/** What the panel's buttons do; the two links (browse, a new duel) go where they say. */
export type TurnMove = Exclude<TurnActionId, 'browse' | 'newDuel'>;

interface UseDuelTurnActionsArgs {
  duelId: number;
  duel: Duel;
  phase: DuelPhase;
  inviteSecret: `0x${string}` | null;
  /** The reader's wallet, lowercased; undefined while signed out or still loading. */
  walletAddress: string | undefined;
  refetch: () => Promise<unknown>;
  openTopUp: () => void;
}

/**
 * Every move the panel offers: joining through the join flow, every other write through the signing
 * window, and Privy's sign-in. Taking a stake back after the time to answer ran out
 * is one call that closes the duel and pays out (`refundAndClaimPayouts`); a finished duel's stake
 * or winnings are `claimPayout`.
 */
export function useDuelTurnActions({ duelId, duel, phase, inviteSecret, walletAddress, refetch, openTopUp }: UseDuelTurnActionsArgs) {
  const { t, language } = useTranslation();
  const { login } = usePrivy();
  const nicknameAddresses = useMemo(() => [duel.creator, duel.opponent, duel.claimedWinner], [duel.creator, duel.opponent, duel.claimedWinner]);
  const { resolveDisplay } = useNicknames(nicknameAddresses);
  const joinFlow = useJoinDuelFlow({ duelId, duel, inviteSecret, refetchDuel: refetch });
  const actionFlow = useActionFlow({ duelId, refetchDuel: refetch });

  const id = BigInt(duelId);
  const da = actionFlow.duelActions;
  const claimPayout = () => actionFlow.openFlow(claimPayoutConfig(() => da.claimPayout(id)));
  const moves: Record<TurnMove, () => void> = {
    join: joinFlow.handleOpenJoinFlow,
    topUp: openTopUp,
    // A duel open to anyone is declined with the open secret; the contract checks it like any other.
    decline: () => actionFlow.openFlow(declineDuelConfig(() => da.declineDuel(id, inviteSecret ?? OPEN_DUEL_INVITE_SECRET))),
    signIn: () => login(),
    cancel: () => actionFlow.openFlow(cancelDuelConfig(() => da.cancelDuel(id))),
    callOff: () => actionFlow.openFlow(requestMutualCancellationConfig(() => da.requestMutualCancellation(id))),
    withdraw: () => actionFlow.openFlow(withdrawMutualCancellationConfig(() => da.withdrawMutualCancellationRequest(id))),
    agree: () => actionFlow.openFlow(acceptMutualCancellationConfig(() => da.acceptMutualCancellation(id))),
    keepPlaying: () => actionFlow.openFlow(declineMutualCancellationConfig(() => da.declineMutualCancellation(id))),
    won: () => actionFlow.openFlow(claimVictoryConfig(() => da.claimVictory(id))),
    lost: () => actionFlow.openFlow(admitDefeatConfig(() => da.admitDefeat(id))),
    confirm: () => actionFlow.openFlow(confirmResultConfig(() => da.confirmResult(id))),
    dispute: () => actionFlow.openFlow(disputeResultConfig(() => da.disputeResult(id))),
    takeBack: phase === 'timeout' ? () => actionFlow.openFlow(refundAndClaimConfig(() => da.refundAndClaimPayouts([id]))) : claimPayout,
    claimWin: claimPayout,
  };

  const isCreator = walletAddress === duel.creator.toLowerCase();
  const claimableAmount = getClaimableAmountForAddress(duel, walletAddress);
  const isFundedPot = duel.state !== DuelState.Created && duel.state !== DuelState.Cancelled && duel.state !== DuelState.Declined;
  const summaryContext: ActionFlowSummaryContext = {
    duelId,
    formattedWager: `${formatUSDT(duel.wagerAmount, language)} USDT`,
    formattedPot: `${formatUSDT(isFundedPot ? duel.wagerAmount * 2n : duel.wagerAmount, language)} USDT`,
    chainName: DEFAULT_CHAIN.name,
    opponentDisplay: resolveDisplay(isCreator ? duel.opponent : duel.creator),
    claimedWinnerDisplay: duel.claimedWinner !== ZERO_ADDRESS ? resolveDisplay(duel.claimedWinner) : '',
    claimableDisplay: claimableAmount > 0n ? `${formatUSDT(claimableAmount, language)} USDT` : '',
    t,
  };

  return {
    run: (move: TurnMove) => moves[move](),
    /** A move is under way: nothing else may start until it settles. */
    isBusy: actionFlow.flow !== null || joinFlow.flow !== null,
    joinFlow,
    actionFlow,
    summaryContext,
  };
}
