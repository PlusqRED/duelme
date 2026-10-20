'use client';

import { useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { LogIn, Shield, Swords, XCircle } from 'lucide-react';
import { ActionFlowDialog } from '@/components/duel/ActionFlowDialog';
import { ClaimButtons } from '@/components/duel/ClaimButtons';
import { ConfirmResult } from '@/components/duel/ConfirmResult';
import { JoinDuelFlowDialog } from '@/components/duel/JoinDuelFlowDialog';
import { MutualCancellationCard } from '@/components/duel/MutualCancellationCard';
import { ShareLink } from '@/components/duel/ShareLink';
import { DuelOutcomeNotice } from '@/components/duel/room/DuelOutcomeNotice';
import { Button } from '@/components/ui/button';
import { useActionFlow } from '@/hooks/useActionFlow';
import { useDuelResponses } from '@/hooks/useDuelResponses';
import { useJoinDuelFlow } from '@/hooks/useJoinDuelFlow';
import { useNicknames } from '@/hooks/useNicknames';
import { useTranslation } from '@/i18n/useTranslation';
import type { ActionFlowSummaryContext } from '@/lib/actionFlow';
import {
  admitDefeatConfig,
  claimPayoutConfig,
  claimVictoryConfig,
  confirmResultConfig,
  disputeResultConfig,
  refundConfig,
  requestMutualCancellationConfig,
} from '@/lib/actionFlowConfigs';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_ID, DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';
import { DuelState, type Duel } from '@/lib/contracts';
import { getClaimableAmountForAddress } from '@/lib/duel';
import { canPresentInvite, isPublicDuel, matchesInviteHash } from '@/lib/invite';
import { formatUSDT } from '@/lib/utils';

interface DuelActionsProps {
  duelId: number;
  duel: Duel;
  inviteSecret: `0x${string}` | null;
  /** The reader's wallet, lowercased; undefined while signed out or still loading. */
  walletAddress: string | undefined;
  refetch: () => Promise<unknown>;
}

/**
 * What the reader can do in this duel: share or cancel it, join or decline it, report the result,
 * answer a report or a request to call it off, and take the money it holds. Kept from the old page,
 * each opening its existing window, until the duel page's own panel replaces it.
 */
export function DuelActions({ duelId, duel, inviteSecret, walletAddress, refetch }: DuelActionsProps) {
  const { t, language } = useTranslation();
  const { authenticated, login } = usePrivy();
  const duelMeAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID] ?? ZERO_ADDRESS;
  const nicknameAddresses = useMemo(
    () => [duel.creator, duel.opponent, duel.claimedBy, duel.claimedWinner, duel.cancelRequestedBy],
    [duel.creator, duel.opponent, duel.claimedBy, duel.claimedWinner, duel.cancelRequestedBy]
  );
  const { resolveDisplay } = useNicknames(nicknameAddresses);
  const responses = useDuelResponses(duelId, duel, inviteSecret, refetch);
  const joinFlow = useJoinDuelFlow({ duelId, duel, inviteSecret, refetchDuel: refetch });
  const actionFlow = useActionFlow({ duelId, refetchDuel: refetch });

  const state = duel.state;
  const isWaitingOpponent = state === DuelState.Created;
  const isFunded = state === DuelState.Funded;
  const isCreator = !!walletAddress && walletAddress === duel.creator.toLowerCase();
  const isOpponent = !!walletAddress && walletAddress === duel.opponent.toLowerCase();
  const canManage = authenticated && (isCreator || isOpponent);
  const isClaimAuthor = walletAddress === duel.claimedBy.toLowerCase();
  const isCancelRequester = walletAddress === duel.cancelRequestedBy.toLowerCase();
  // Holding the secret. `canPresentInvite` is the question the contract asks in `_requireAdmitted`
  // — an open duel needs no secret — and is what gates the controls; this one is only about whether
  // this viewer has the secret itself.
  const hasInviteAccess = matchesInviteHash(inviteSecret, duel.inviteHash, duelMeAddress, DEFAULT_CHAIN_ID);
  const canPresentDuelInvite = canPresentInvite(inviteSecret, duel.inviteHash, duelMeAddress, DEFAULT_CHAIN_ID);
  const isDuelPublic = isPublicDuel(duel.inviteHash);
  // The contract refuses a decline only for a duel that is open in *both* senses — no secret and no
  // invited opponent — since its invite is public and any passer-by could otherwise end it. A duel
  // addressed to one player is declinable by that player, secret or not.
  const isDeclinableDuel = !isDuelPublic || duel.invitedOpponent !== ZERO_ADDRESS;
  const hasResolvedViewerAddress = !authenticated || !!walletAddress;
  const canLoginToJoin = isWaitingOpponent && canPresentDuelInvite && !authenticated;
  const showsPrivateInviteNotice = !isDuelPublic && isWaitingOpponent && hasResolvedViewerAddress && !isCreator && !hasInviteAccess;
  const claimableAmount = getClaimableAmountForAddress(duel, walletAddress);
  const isBusy = responses.isBusy;

  const wagerDisplay = formatUSDT(duel.wagerAmount, language);
  const isFundedPot = state !== DuelState.Created && state !== DuelState.Cancelled && state !== DuelState.Declined;
  const summaryContext: ActionFlowSummaryContext = {
    duelId,
    formattedWager: `${wagerDisplay} USDT`,
    formattedPot: `${formatUSDT(isFundedPot ? duel.wagerAmount * 2n : duel.wagerAmount, language)} USDT`,
    chainName: DEFAULT_CHAIN.name,
    opponentDisplay: resolveDisplay(isCreator ? duel.opponent : duel.creator),
    claimedWinnerDisplay: duel.claimedWinner !== ZERO_ADDRESS ? resolveDisplay(duel.claimedWinner) : '',
    claimableDisplay: claimableAmount > 0n ? `${formatUSDT(claimableAmount, language)} USDT` : '',
    t,
  };

  const id = BigInt(duelId);
  const da = actionFlow.duelActions;

  return (
    <div className="flex flex-col gap-4">
      {isWaitingOpponent && isCreator && authenticated && (
        <>
          <ShareLink duelId={duelId} inviteHash={duel.inviteHash} inviteSecret={inviteSecret} />
          <Button variant="ghost" size="sm" className="self-center" onClick={responses.cancel} disabled={isBusy}>
            {responses.pending === 'canceling' ? t('status.processing') : t('action.cancel')}
          </Button>
        </>
      )}

      {showsPrivateInviteNotice && (
        <div className="rounded-xl border border-line bg-canvas p-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-canvas-deep">
            <Shield className="h-5 w-5 text-ink-2" />
          </div>
          <p className="text-sm font-medium text-ink">{t('duel.privateInviteRequired')}</p>
          <p className="mt-1 text-xs text-ink-3">{t('duel.privateInviteMissing')}</p>
        </div>
      )}

      {joinFlow.canJoin && (
        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={joinFlow.handleOpenJoinFlow} disabled={isBusy || joinFlow.flow !== null}>
            <Swords className="h-4 w-4" />
            {t('action.join')} — {wagerDisplay} USDT
          </Button>
          {isDeclinableDuel && (
            <Button size="lg" variant="paper" className="w-full" onClick={responses.decline} disabled={isBusy}>
              {responses.pending === 'declining' ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-3 border-t-transparent" />
                  {t('status.declining')}
                </span>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  {t('action.decline')}
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {canLoginToJoin && (
        <Button size="lg" className="w-full" onClick={login}>
          <LogIn className="h-4 w-4" />
          {t('action.loginToJoin')}
        </Button>
      )}

      {isFunded && canManage && (
        <>
          <ClaimButtons
            onClaimVictory={() => actionFlow.openFlow(claimVictoryConfig(() => da.claimVictory(id)))}
            onAdmitDefeat={() => actionFlow.openFlow(admitDefeatConfig(() => da.admitDefeat(id)))}
            isPending={isBusy}
          />
          <MutualCancellationCard
            mode="available"
            pendingAction={responses.pending}
            isPending={isBusy}
            onRequest={() => actionFlow.openFlow(requestMutualCancellationConfig(() => da.requestMutualCancellation(id)))}
            resolveDisplay={resolveDisplay}
          />
        </>
      )}

      {isFunded && !canManage && (
        <div className="rounded-2xl border border-line bg-canvas p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <Shield className="h-4 w-4" />
            <span>{t('duel.spectatorFundedTitle')}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink-2">{t('duel.spectatorFundedHint')}</p>
        </div>
      )}

      {state === DuelState.MutualCancelRequested && (
        <MutualCancellationCard
          mode={canManage ? (isCancelRequester ? 'requester' : 'responder') : 'spectator'}
          requestedBy={duel.cancelRequestedBy}
          requestedAt={duel.cancelRequestedAt}
          viewerAddress={walletAddress}
          pendingAction={responses.pending}
          isPending={isBusy}
          onAccept={responses.acceptCancellation}
          onDecline={responses.declineCancellation}
          onWithdraw={responses.withdrawCancellation}
          resolveDisplay={resolveDisplay}
        />
      )}

      {state === DuelState.WinnerClaimed && (
        <ConfirmResult
          claimedBy={duel.claimedBy}
          claimedWinner={duel.claimedWinner}
          viewerAddress={walletAddress}
          isParticipantViewer={canManage}
          claimTimestamp={Number(duel.claimTimestamp)}
          onConfirm={() => actionFlow.openFlow(confirmResultConfig(() => da.confirmResult(id)))}
          onDispute={() => actionFlow.openFlow(disputeResultConfig(() => da.disputeResult(id)))}
          onRefund={() => actionFlow.openFlow(refundConfig(() => da.refund(id)))}
          isPending={isBusy}
          canConfirm={canManage && !isClaimAuthor}
          canDispute={canManage && !isClaimAuthor}
          canRefund={canManage}
          resolveDisplay={resolveDisplay}
        />
      )}

      <DuelOutcomeNotice
        duel={duel}
        resolveDisplay={resolveDisplay}
        canManage={canManage}
        claimableAmount={claimableAmount}
        isBusy={isBusy || actionFlow.flow !== null}
        onClaim={() => actionFlow.openFlow(claimPayoutConfig(() => da.claimPayout(id)))}
      />

      <JoinDuelFlowDialog
        open={joinFlow.flow !== null}
        canClose={joinFlow.canCloseFlow}
        draft={joinFlow.flow?.draft ?? null}
        stage={joinFlow.flow?.stage ?? 'review'}
        actionState={joinFlow.flow?.actionState ?? 'idle'}
        needsNetworkSwitch={joinFlow.needsNetworkSwitch}
        needsApproval={joinFlow.needsApproval}
        completedSwitchNetwork={joinFlow.flow?.completedSteps.switchNetwork ?? false}
        completedApproval={joinFlow.flow?.completedSteps.approve ?? false}
        errorMessage={joinFlow.flow?.errorMessage}
        review={joinFlow.review}
        onOpenChange={joinFlow.handleFlowOpenChange}
        onContinue={joinFlow.handleContinueFlow}
        onSwitchNetwork={joinFlow.handleSwitchNetwork}
        onApprove={joinFlow.handleApprove}
        onJoinDuel={joinFlow.handleJoinTransaction}
        onDone={joinFlow.closeFlow}
      />

      <ActionFlowDialog
        open={actionFlow.flow !== null}
        canClose={actionFlow.canClose}
        flow={actionFlow.flow}
        config={actionFlow.activeConfig}
        needsNetworkSwitch={actionFlow.needsNetworkSwitch}
        summaryContext={summaryContext}
        onOpenChange={actionFlow.handleFlowOpenChange}
        onContinue={actionFlow.handleContinue}
        onSwitchNetwork={actionFlow.handleSwitchNetwork}
        onExecute={actionFlow.handleExecute}
        onDone={actionFlow.closeFlow}
      />
    </div>
  );
}
