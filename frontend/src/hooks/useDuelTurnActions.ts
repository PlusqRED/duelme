'use client';

import { useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useActionFlow } from '@/hooks/useActionFlow';
import { useJoinDuelFlow } from '@/hooks/useJoinDuelFlow';
import { useNicknames } from '@/hooks/useNicknames';
import { useTranslation } from '@/i18n/useTranslation';
import type { ActionFlowConfig, ActionFlowSummaryContext } from '@/lib/actionFlow';
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
  // The window words the move as the duel stood when it opened: the refetch after the write empties
  // what was claimable, and Done must still say what was taken.
  const [openedContext, setOpenedContext] = useState<ActionFlowSummaryContext | null>(null);

  const id = BigInt(duelId);
  const open = (config: ActionFlowConfig) => {
    setOpenedContext(summaryContext);
    actionFlow.openFlow(config);
  };
  const moves: Record<TurnMove, () => void> = {
    join: joinFlow.handleOpenJoinFlow,
    topUp: openTopUp,
    // A duel open to anyone is declined with the open secret; the contract checks it like any other.
    decline: () => open(declineDuelConfig((actions) => actions.declineDuel(id, inviteSecret ?? OPEN_DUEL_INVITE_SECRET))),
    signIn: () => login(),
    cancel: () => open(cancelDuelConfig((actions) => actions.cancelDuel(id))),
    callOff: () => open(requestMutualCancellationConfig((actions) => actions.requestMutualCancellation(id))),
    withdraw: () => open(withdrawMutualCancellationConfig((actions) => actions.withdrawMutualCancellationRequest(id))),
    agree: () => open(acceptMutualCancellationConfig((actions) => actions.acceptMutualCancellation(id))),
    keepPlaying: () => open(declineMutualCancellationConfig((actions) => actions.declineMutualCancellation(id))),
    won: () => open(claimVictoryConfig((actions) => actions.claimVictory(id))),
    lost: () => open(admitDefeatConfig((actions) => actions.admitDefeat(id))),
    confirm: () => open(confirmResultConfig((actions) => actions.confirmResult(id))),
    dispute: () => open(disputeResultConfig((actions) => actions.disputeResult(id))),
    takeBack:
      phase === 'timeout'
        ? () => open(refundAndClaimConfig((actions) => actions.refundAndClaimPayouts([id])))
        : () => open(claimPayoutConfig((actions) => actions.claimPayout(id), false)),
    claimWin: () => open(claimPayoutConfig((actions) => actions.claimPayout(id), true)),
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
    // Kept past the flow too: the window still shows Done while it animates closed.
    summaryContext: openedContext ?? summaryContext,
  };
}

export type DuelTurnActions = ReturnType<typeof useDuelTurnActions>;
