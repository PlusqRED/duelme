'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShareLink } from '@/components/duel/ShareLink';
import { ClaimButtons } from '@/components/duel/ClaimButtons';
import { ConfirmResult } from '@/components/duel/ConfirmResult';
import { useAppToast } from '@/hooks/useAppToast';
import { useTranslation } from '@/i18n/useTranslation';
import { DuelState } from '@/lib/contracts';
import { getClaimableAmountForAddress, isDuelClaimTimedOut } from '@/lib/duel';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { hashInviteSecret, readInviteSecretFromHash, readStoredInviteSecret, storeInviteSecret, isPublicDuel, PUBLIC_INVITE_SECRET } from '@/lib/invite';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN_ID, ZERO_ADDRESS, CLAIM_TIMEOUT } from '@/lib/constants';
import { useDuel } from '@/hooks/useDuel';
import { useDuelActions } from '@/hooks/useDuelActions';
import { formatDateTime, formatUSDT } from '@/lib/utils';
import { usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useSwitchChain, useAccount } from 'wagmi';
import {
  Clock, Trophy, ArrowLeft, XCircle, RotateCcw,
  Swords, LogIn, Hourglass, Shield, Handshake, Globe, Lock, TimerOff,
} from 'lucide-react';
import Link from 'next/link';
import { ActionFlowDialog } from '@/components/duel/ActionFlowDialog';
import { PlayerCard } from '@/components/duel/PlayerCard';
import { JoinDuelFlowDialog } from '@/components/duel/JoinDuelFlowDialog';
import { MutualCancellationCard } from '@/components/duel/MutualCancellationCard';
import { useActionFlow } from '@/hooks/useActionFlow';
import { useJoinDuelFlow } from '@/hooks/useJoinDuelFlow';
import { useNicknames } from '@/hooks/useNicknames';
import type { ActionFlowSummaryContext } from '@/lib/actionFlow';
import {
  claimVictoryConfig, admitDefeatConfig, confirmResultConfig,
  disputeResultConfig, requestMutualCancellationConfig,
  claimPayoutConfig, refundConfig,
} from '@/lib/actionFlowConfigs';

const STATUS_CONFIG: Record<
  DuelState,
  { icon: React.ElementType; gradient: string; label: string }
> = {
  [DuelState.Created]: { icon: Hourglass, gradient: 'from-blue-600 to-indigo-600', label: 'duel.waiting' },
  [DuelState.Funded]: { icon: Swords, gradient: 'from-indigo-600 to-violet-600', label: 'duel.inProgress' },
  [DuelState.WinnerClaimed]: { icon: Clock, gradient: 'from-amber-500 to-orange-500', label: 'duel.waitingConfirm' },
  [DuelState.Resolved]: { icon: Trophy, gradient: 'from-emerald-500 to-green-600', label: 'duel.resolved' },
  [DuelState.Refunded]: { icon: RotateCcw, gradient: 'from-slate-500 to-slate-600', label: 'duel.refunded' },
  [DuelState.Cancelled]: { icon: XCircle, gradient: 'from-slate-400 to-slate-500', label: 'duel.cancelled' },
  [DuelState.Declined]: { icon: XCircle, gradient: 'from-rose-500 to-red-500', label: 'duel.declined' },
  [DuelState.Disputed]: { icon: RotateCcw, gradient: 'from-orange-500 to-amber-500', label: 'duel.disputed' },
  [DuelState.MutualCancelRequested]: { icon: Handshake, gradient: 'from-violet-600 to-fuchsia-600', label: 'duel.cancellationPending' },
  [DuelState.MutuallyCancelled]: { icon: Handshake, gradient: 'from-sky-500 to-cyan-600', label: 'duel.mutuallyCancelled' },
};

type PendingAction =
  | 'idle'
  | 'declining'
  | 'canceling'
  | 'acceptingMutualCancel'
  | 'decliningMutualCancelRequest'
  | 'withdrawingMutualCancelRequest';

/* ── Main page ── */
export default function DuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, language } = useTranslation();
  const appToast = useAppToast();
  const duelId = parseInt(id, 10);

  const { authenticated, login } = usePrivy();
  const { walletAddress } = useActiveWallet();
  const [inviteSecret, setInviteSecret] = useState<`0x${string}` | null>(null);

  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();
  const { duel, isLoading, isError, refetch } = useDuel(BigInt(duelId), DEFAULT_CHAIN_ID);
  const {
    declineDuel, cancelDuel,
    acceptMutualCancellation, declineMutualCancellation, withdrawMutualCancellationRequest,
    isPending, isConfirming, isSuccess, error: txError, reset,
  } = useDuelActions(DEFAULT_CHAIN_ID);

  const txPending = isPending || isConfirming;

  const nicknameAddresses = useMemo(() => {
    if (!duel) return [];
    return [duel.creator, duel.opponent, duel.claimedBy, duel.claimedWinner, duel.cancelRequestedBy];
  }, [duel]);
  const { resolveDisplay, nicknameByAddress } = useNicknames(nicknameAddresses);

  const [pendingAction, setPendingAction] = useState<PendingAction>('idle');

  const chainConfig = SUPPORTED_CHAINS.arbitrumSepolia;

  // Auto-inject invite secret for public duels
  useEffect(() => {
    if (!duel) return;
    if (isPublicDuel(duel.inviteHash)) {
      setInviteSecret((current) => current === PUBLIC_INVITE_SECRET ? current : PUBLIC_INVITE_SECRET);
    }
  }, [duel]);

  useEffect(() => {
    const secretFromHash = readInviteSecretFromHash();
    if (secretFromHash) {
      setInviteSecret((current) => current === secretFromHash ? current : secretFromHash);
    }
  }, [duelId]);

  useEffect(() => {
    if (!duel || walletAddress !== duel.creator.toLowerCase() || inviteSecret) return;

    const storedSecret = readStoredInviteSecret(DEFAULT_CHAIN_ID, duelId);
    if (!storedSecret) return;

    setInviteSecret(storedSecret);

    if (window.location.hash.slice(1) !== storedSecret) {
      window.history.replaceState(null, '', `${window.location.pathname}#${storedSecret}`);
    }
  }, [duel, walletAddress, inviteSecret, duelId]);

  useEffect(() => {
    if (!duel || !inviteSecret || walletAddress !== duel.creator.toLowerCase()) return;
    storeInviteSecret(DEFAULT_CHAIN_ID, duelId, inviteSecret);
  }, [duel, inviteSecret, walletAddress, duelId]);

  const joinFlow = useJoinDuelFlow({
    duelId,
    wagerAmount: duel?.wagerAmount ?? 0n,
    inviteSecret,
    creatorAddress: duel?.creator ?? '',
    duelInviteHash: duel?.inviteHash ?? '',
    refetchDuel: refetch,
  });

  const actionFlow = useActionFlow({ duelId, refetchDuel: refetch });

  useEffect(() => {
    if (!isSuccess || pendingAction === 'idle') return;

    const successToastKey = pendingAction === 'acceptingMutualCancel'
      ? 'toast.cancellationAccepted'
      : pendingAction === 'decliningMutualCancelRequest'
        ? 'toast.cancellationDeclined'
        : pendingAction === 'withdrawingMutualCancelRequest'
          ? 'toast.cancellationWithdrawn'
          : 'toast.transactionConfirmed';

    appToast.success(successToastKey);
    refetch();
    reset();
    setPendingAction('idle');
  }, [isSuccess, pendingAction, reset, appToast, refetch]);

  useEffect(() => {
    if (txError) {
      setPendingAction('idle');
      appToast.transactionError(txError);
    }
  }, [txError, appToast]);

  async function ensureChain() {
    if (connectedChainId !== DEFAULT_CHAIN_ID) {
      appToast.info('toast.switchingNetwork', { chain: chainConfig.name });
      try {
        await switchChainAsync({ chainId: DEFAULT_CHAIN_ID });
      } catch {
        appToast.error('toast.switchNetworkFailed', { chain: chainConfig.name });
        return false;
      }
    }
    return true;
  }

  async function handleDecline() {
    if (!duel) return;
    if (!inviteSecret || hashInviteSecret(inviteSecret).toLowerCase() !== duel.inviteHash.toLowerCase()) {
      appToast.error('duel.privateInviteMissing');
      return;
    }

    if (!(await ensureChain())) return;
    setPendingAction('declining');
    appToast.info('toast.decliningDuel');
    declineDuel(BigInt(duelId), inviteSecret);
  }

  async function handleCancel() {
    if (!(await ensureChain())) return;
    setPendingAction('canceling');
    appToast.info('toast.cancellingDuel');
    cancelDuel(BigInt(duelId));
  }

  async function handleAcceptMutualCancellation() {
    if (!(await ensureChain())) return;
    setPendingAction('acceptingMutualCancel');
    appToast.info('toast.acceptingCancellation');
    acceptMutualCancellation(BigInt(duelId));
  }

  async function handleDeclineMutualCancellation() {
    if (!(await ensureChain())) return;
    setPendingAction('decliningMutualCancelRequest');
    appToast.info('toast.decliningCancellation');
    declineMutualCancellation(BigInt(duelId));
  }

  async function handleWithdrawMutualCancellationRequest() {
    if (!(await ensureChain())) return;
    setPendingAction('withdrawingMutualCancelRequest');
    appToast.info('toast.withdrawingCancellation');
    withdrawMutualCancellationRequest(BigInt(duelId));
  }

  /* ── Loading / Error ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !duel) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-slate-500">{t('duel.notFound')}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          {t('nav.dashboard')}
        </Link>
      </div>
    );
  }

  /* ── Derived state ── */
  const state = duel.state;
  const cfg = STATUS_CONFIG[state];
  const isWaitingOpponent = state === DuelState.Created;
  const isFunded = state === DuelState.Funded;
  const isWinnerClaimed = state === DuelState.WinnerClaimed;
  const isResolved = state === DuelState.Resolved;
  const isRefunded = state === DuelState.Refunded;
  const isCancelled = state === DuelState.Cancelled;
  const isDeclined = state === DuelState.Declined;
  const isDisputed = state === DuelState.Disputed;
  const isMutualCancelRequested = state === DuelState.MutualCancelRequested;
  const isMutuallyCancelled = state === DuelState.MutuallyCancelled;
  const isClaimTimedOut = isWinnerClaimed && isDuelClaimTimedOut(duel.claimTimestamp);
  const effectiveCfg = isClaimTimedOut
    ? { icon: TimerOff, gradient: 'from-red-500 to-rose-600', label: 'duel.responseTimedOut' }
    : cfg;
  const StatusIcon = effectiveCfg.icon;

  const isCreator = walletAddress === duel.creator.toLowerCase();
  const isOpponent = walletAddress === duel.opponent.toLowerCase();
  const isParticipant = isCreator || isOpponent;
  const canManageParticipantDuel = authenticated && isParticipant;
  const isClaimAuthor = walletAddress === duel.claimedBy.toLowerCase();
  const isCancelRequester = walletAddress === duel.cancelRequestedBy.toLowerCase();
  const hasInviteAccess = !!inviteSecret
    && hashInviteSecret(inviteSecret).toLowerCase() === duel.inviteHash.toLowerCase();
  const isDuelPublic = isPublicDuel(duel.inviteHash);
  const claimableAmount = getClaimableAmountForAddress(duel, walletAddress);
  const hasClaimablePayout = claimableAmount > 0n;
  const hasMessage = hasVisibleDuelMessage(duel.message);
  const backHref = authenticated ? '/dashboard' : '/';
  const backLabel = authenticated ? t('nav.dashboard') : t('sidenav.hero');

  const wagerDisplay = Number(duel.wagerAmount) / 1e6;
  const hasOpponent = duel.opponent !== ZERO_ADDRESS;
  const isFundedPot = state === DuelState.Funded
    || state === DuelState.MutualCancelRequested
    || state === DuelState.WinnerClaimed
    || state === DuelState.Resolved
    || state === DuelState.Refunded
    || state === DuelState.Disputed
    || state === DuelState.MutuallyCancelled;
  const potDisplay = isFundedPot ? wagerDisplay * 2 : wagerDisplay;
  const creatorIsWinner = isResolved && duel.claimedWinner.toLowerCase() === duel.creator.toLowerCase();
  const opponentIsWinner = isResolved && hasOpponent && duel.claimedWinner.toLowerCase() === duel.opponent.toLowerCase();
  const creatorIsReportedWinner = isWinnerClaimed && duel.claimedWinner.toLowerCase() === duel.creator.toLowerCase();
  const opponentIsReportedWinner = isWinnerClaimed && hasOpponent && duel.claimedWinner.toLowerCase() === duel.opponent.toLowerCase();

  const timelineEvents = [
    { label: t('duel.timelineCreated'), timestamp: duel.createdAt, dotColor: 'bg-blue-500' },
    duel.fundedAt > 0n ? { label: t('duel.timelineAccepted'), timestamp: duel.fundedAt, dotColor: 'bg-green-500' } : null,
    duel.cancelRequestedAt > 0n ? { label: t('duel.timelineCancellationRequested'), timestamp: duel.cancelRequestedAt, dotColor: 'bg-violet-500' } : null,
    duel.claimTimestamp > 0n ? { label: t('duel.timelineResultSubmitted'), timestamp: duel.claimTimestamp, dotColor: 'bg-amber-500' } : null,
    isClaimTimedOut
      ? { label: t('duel.timelineTimedOut'), timestamp: duel.claimTimestamp + BigInt(CLAIM_TIMEOUT), dotColor: 'bg-red-500' }
      : null,
    duel.finalizedAt > 0n
      ? {
          label: t(
            isResolved
              ? 'duel.timelineResolved'
              : isRefunded
                ? 'duel.timelineRefunded'
                : isCancelled
                  ? 'duel.timelineCancelled'
                  : isDeclined
                    ? 'duel.timelineDeclined'
                    : isDisputed
                      ? 'duel.timelineDisputed'
                      : 'duel.timelineMutuallyCancelled'
          ),
          timestamp: duel.finalizedAt,
          dotColor: isResolved ? 'bg-emerald-500'
            : isCancelled ? 'bg-slate-400'
            : isDeclined ? 'bg-rose-400'
            : isDisputed ? 'bg-orange-500'
            : isMutuallyCancelled ? 'bg-sky-500'
            : 'bg-slate-500',
        }
      : null,
  ].filter((event): event is { label: string; timestamp: bigint; dotColor: string } => event !== null);

  const claimHintKey = isResolved
    ? 'duel.resolvedClaimHint'
    : isRefunded
      ? 'duel.refundedClaimHint'
      : isDeclined
        ? 'duel.declinedClaimHint'
        : isDisputed
          ? 'duel.disputedClaimHint'
          : isMutuallyCancelled
            ? 'duel.mutuallyCancelledClaimHint'
          : isCancelled
            ? 'duel.cancelledClaimHint'
            : null;

  const opponentAddr = isCreator ? duel.opponent : duel.creator;
  const summaryContext: ActionFlowSummaryContext = {
    duelId,
    formattedWager: `${wagerDisplay} USDT`,
    formattedPot: `${potDisplay} USDT`,
    chainName: chainConfig.name,
    opponentDisplay: resolveDisplay(opponentAddr),
    claimedWinnerDisplay: duel.claimedWinner !== ZERO_ADDRESS ? resolveDisplay(duel.claimedWinner) : '',
    claimableDisplay: hasClaimablePayout ? `${formatUSDT(claimableAmount)} USDT` : '',
    t,
  };

  const da = actionFlow.duelActions;
  function openClaimVictory() {
    actionFlow.openFlow(claimVictoryConfig(() => da.claimVictory(BigInt(duelId))));
  }
  function openAdmitDefeat() {
    actionFlow.openFlow(admitDefeatConfig(() => da.admitDefeat(BigInt(duelId))));
  }
  function openConfirmResult() {
    actionFlow.openFlow(confirmResultConfig(() => da.confirmResult(BigInt(duelId))));
  }
  function openDisputeResult() {
    actionFlow.openFlow(disputeResultConfig(() => da.disputeResult(BigInt(duelId))));
  }
  function openRequestCancellation() {
    actionFlow.openFlow(requestMutualCancellationConfig(() => da.requestMutualCancellation(BigInt(duelId))));
  }
  function openClaimPayout() {
    actionFlow.openFlow(claimPayoutConfig(() => da.claimPayout(BigInt(duelId))));
  }
  function openRefund() {
    actionFlow.openFlow(refundConfig(() => da.refund(BigInt(duelId))));
  }

  /* ── Render ── */
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Back link */}
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {backLabel}
      </Link>

      <div className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* ── Status header with gradient ── */}
        <div className={`bg-gradient-to-r ${effectiveCfg.gradient} px-6 py-5 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-5 w-5 opacity-80" />
              <span className="text-lg font-bold">{t('duel.title', { id: duelId })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                {t(effectiveCfg.label as Parameters<typeof t>[0])}
              </span>
              {isDuelPublic ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <Globe className="h-3 w-3" />
                  {t('duel.public')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                  <Lock className="h-3 w-3" />
                  {t('duel.private')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-0">
          {/* ── VS Arena ── */}
          <div className="flex items-center justify-center gap-4 px-6 py-8 sm:gap-8">
            <PlayerCard
              address={duel.creator}
              label={t('duel.creator')}
              isWinner={creatorIsWinner}
              isReportedWinner={creatorIsReportedWinner}
              isYou={isCreator}
              isEmpty={false}
              nickname={nicknameByAddress[duel.creator.toLowerCase()]}
            />

            {/* VS badge */}
            <div className="flex flex-col items-center gap-1">
              <div className="vs-badge !h-10 !w-10 !rounded-xl !text-sm">
                VS
              </div>
            </div>

            <PlayerCard
              address={duel.opponent}
              label={t('duel.opponent')}
              isWinner={opponentIsWinner}
              isReportedWinner={opponentIsReportedWinner}
              isYou={isOpponent}
              isEmpty={!hasOpponent}
              nickname={hasOpponent ? nicknameByAddress[duel.opponent.toLowerCase()] : undefined}
            />
          </div>

          {/* ── Pot / Wager center block ── */}
          <div className="flex justify-center border-t border-slate-100 px-6 py-5">
            <div className="flex items-center gap-6 sm:gap-10">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {t('duel.wager')}
                </span>
                <span className="text-lg font-bold text-slate-900">{wagerDisplay} USDT</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
                  {t('duel.pot')}
                </span>
                <span className="text-lg font-bold text-indigo-600">{potDisplay} USDT</span>
              </div>
            </div>
          </div>

          {hasMessage && (
            <div className="border-t border-slate-100 px-6 py-5">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
                  {t('duel.messageTitle')}
                </div>
                <p className="text-base font-medium leading-relaxed text-slate-900">{duel.message}</p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 px-6 py-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">{t('duel.timelineTitle')}</h2>
            </div>
            <div className="space-y-3">
              {timelineEvents.map((event) => (
                <div key={`${event.label}-${event.timestamp.toString()}`} className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${event.dotColor}`} />
                    <span className="text-sm font-medium text-slate-700">{event.label}</span>
                  </div>
                  <span className="text-right text-sm text-slate-500">
                    {formatDateTime(event.timestamp, language)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Actions zone ── */}
          <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-5">

            {/* Created → Creator: share + cancel */}
            {isWaitingOpponent && isCreator && authenticated && (
              <>
                <ShareLink duelId={duelId} inviteHash={duel.inviteHash} inviteSecret={inviteSecret} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-center text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={handleCancel}
                  disabled={txPending}
                >
                  {pendingAction === 'canceling' ? t('status.processing') : t('action.cancel')}
                </Button>
              </>
            )}

            {/* Created → Invitee: private-link response */}
            {!isDuelPublic && isWaitingOpponent && !isCreator && !hasInviteAccess && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/70">
                  <Shield className="h-5 w-5 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-800">{t('duel.privateInviteRequired')}</p>
                <p className="mt-1 text-xs text-slate-500">{t('duel.privateInviteMissing')}</p>
              </div>
            )}

            {isWaitingOpponent && !isCreator && (isDuelPublic || hasInviteAccess) && authenticated && (
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="h-12 w-full bg-indigo-600 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                  onClick={joinFlow.handleOpenJoinFlow}
                  disabled={txPending || joinFlow.flow !== null}
                >
                  <Swords className="mr-2 h-4 w-4" />
                  {t('action.join')} — {wagerDisplay} USDT
                </Button>
                {!isDuelPublic && hasInviteAccess && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                    onClick={handleDecline}
                    disabled={txPending}
                  >
                    {pendingAction === 'declining' ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                        {t('status.declining')}
                      </span>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        {t('action.decline')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {isWaitingOpponent && !isCreator && (isDuelPublic || hasInviteAccess) && !authenticated && (
              <Button
                size="lg"
                className="h-12 w-full bg-indigo-600 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                onClick={login}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {t('action.loginToJoin')}
              </Button>
            )}

            {/* Funded → claim buttons */}
            {isFunded && canManageParticipantDuel && (
              <>
                <ClaimButtons
                  onClaimVictory={openClaimVictory}
                  onAdmitDefeat={openAdmitDefeat}
                  isPending={txPending}
                />
                <MutualCancellationCard
                  mode="available"
                  pendingAction={pendingAction}
                  isPending={txPending}
                  onRequest={openRequestCancellation}
                  resolveDisplay={resolveDisplay}
                />
              </>
            )}

            {isFunded && !canManageParticipantDuel && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                  <Shield className="h-4 w-4" />
                  <span>{t('duel.spectatorFundedTitle')}</span>
                </div>
                <p className="text-sm leading-relaxed text-indigo-800">{t('duel.spectatorFundedHint')}</p>
              </div>
            )}

            {isMutualCancelRequested && (
              <MutualCancellationCard
                mode={
                  canManageParticipantDuel
                    ? isCancelRequester
                      ? 'requester'
                      : 'responder'
                    : 'spectator'
                }
                requestedBy={duel.cancelRequestedBy}
                requestedAt={duel.cancelRequestedAt}
                viewerAddress={walletAddress}
                pendingAction={pendingAction}
                isPending={txPending}
                onAccept={handleAcceptMutualCancellation}
                onDecline={handleDeclineMutualCancellation}
                onWithdraw={handleWithdrawMutualCancellationRequest}
                resolveDisplay={resolveDisplay}
              />
            )}

            {/* WinnerClaimed → confirm */}
            {isWinnerClaimed && (
              <ConfirmResult
                claimedBy={duel.claimedBy}
                claimedWinner={duel.claimedWinner}
                viewerAddress={walletAddress}
                isParticipantViewer={canManageParticipantDuel}
                claimTimestamp={Number(duel.claimTimestamp)}
                onConfirm={openConfirmResult}
                onDispute={openDisputeResult}
                onRefund={openRefund}
                isPending={txPending}
                canConfirm={canManageParticipantDuel && !isClaimAuthor}
                canDispute={canManageParticipantDuel && !isClaimAuthor}
                canRefund={canManageParticipantDuel}
                resolveDisplay={resolveDisplay}
              />
            )}

            {/* Resolved */}
            {isResolved && duel.claimedWinner !== ZERO_ADDRESS && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-4">
                <Trophy className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">
                  {resolveDisplay(duel.claimedWinner)} {t('recent.won')}!
                </span>
              </div>
            )}

            {/* Refunded */}
            {isRefunded && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-4">
                <RotateCcw className="h-5 w-5 text-slate-500" />
                <span className="text-sm text-slate-600">{t('duel.refunded')}</span>
              </div>
            )}

            {/* Cancelled */}
            {isCancelled && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-4">
                <XCircle className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-500">{t('duel.cancelled')}</span>
              </div>
            )}

            {/* Declined */}
            {isDeclined && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 p-4">
                <XCircle className="h-5 w-5 text-rose-500" />
                <span className="text-sm font-medium text-rose-700">{t('duel.declined')}</span>
              </div>
            )}

            {/* Disputed */}
            {isDisputed && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-orange-50 p-4">
                <RotateCcw className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">{t('duel.disputed')}</span>
              </div>
            )}

            {isMutuallyCancelled && (
              <div className="space-y-3 rounded-xl bg-sky-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Handshake className="h-5 w-5 text-sky-600" />
                  <span className="text-sm font-medium text-sky-800">{t('duel.mutuallyCancelled')}</span>
                </div>
                <p className="text-sm text-sky-700">{t('duel.mutuallyCancelledSummary')}</p>
              </div>
            )}

            {claimHintKey && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    {canManageParticipantDuel && hasClaimablePayout && (
                      <p className="text-lg font-bold text-slate-900">
                        {formatUSDT(claimableAmount)} USDT
                      </p>
                    )}
                    <p className="text-sm text-slate-600">{t(claimHintKey as Parameters<typeof t>[0])}</p>
                  </div>

                  {canManageParticipantDuel && hasClaimablePayout && (
                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 text-white shadow-sm shadow-emerald-200 hover:from-emerald-600 hover:via-emerald-700 hover:to-green-700 sm:w-auto"
                      onClick={openClaimPayout}
                      disabled={txPending || actionFlow.flow !== null}
                    >
                      {t('action.claimFunds')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
