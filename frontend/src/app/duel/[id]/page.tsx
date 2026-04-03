'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShareLink } from '@/components/duel/ShareLink';
import { ClaimButtons } from '@/components/duel/ClaimButtons';
import { ConfirmResult } from '@/components/duel/ConfirmResult';
import { ReputationBadge } from '@/components/duel/ReputationBadge';
import { useAppToast } from '@/hooks/useAppToast';
import { useTranslation } from '@/i18n/useTranslation';
import { DuelState, erc20Abi } from '@/lib/contracts';
import { getClaimableAmountForAddress } from '@/lib/duel';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { hashInviteSecret, readInviteSecretFromHash, readStoredInviteSecret, storeInviteSecret, isPublicDuel, PUBLIC_INVITE_SECRET } from '@/lib/invite';
import { SUPPORTED_CHAINS, DUELME_ADDRESSES } from '@/lib/constants';
import { useDuel } from '@/hooks/useDuel';
import { useDuelActions } from '@/hooks/useDuelActions';
import { formatDateTime, formatUSDT, truncateAddress } from '@/lib/utils';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSwitchChain, useAccount, useReadContract } from 'wagmi';
import { emitBalanceRefresh } from '@/lib/balanceRefresh';
import {
  Clock, Trophy, ArrowLeft, XCircle, RotateCcw,
  Swords, LogIn, User, Hourglass, Shield, Handshake, Undo2, Globe, Lock,
} from 'lucide-react';
import Link from 'next/link';
import { CopyableAddress } from '@/components/duel/CopyableAddress';
import { useNicknames } from '@/hooks/useNicknames';

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

const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.arbitrumSepolia.id;
const ZERO = '0x0000000000000000000000000000000000000000';
type PendingAction =
  | 'idle'
  | 'approvingJoin'
  | 'joining'
  | 'declining'
  | 'canceling'
  | 'claimVictory'
  | 'admitDefeat'
  | 'requestingMutualCancel'
  | 'acceptingMutualCancel'
  | 'decliningMutualCancelRequest'
  | 'withdrawingMutualCancelRequest'
  | 'confirmingResult'
  | 'disputingResult'
  | 'refunding'
  | 'claimingPayout';

/* ── Player card (VS arena) ── */
function PlayerCard({
  address,
  label,
  isWinner,
  isReportedWinner,
  isYou,
  isEmpty,
  nickname,
}: {
  address: string;
  label: string;
  isWinner: boolean;
  isReportedWinner: boolean;
  isYou: boolean;
  isEmpty: boolean;
  nickname?: string | null;
}) {
  const { t } = useTranslation();
  const highlightClass = isWinner
    ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
    : isReportedWinner
      ? 'border-amber-300 bg-amber-50 shadow-lg shadow-amber-100'
      : isEmpty
        ? 'border-dashed border-slate-300 bg-slate-50'
        : 'border-slate-200 bg-slate-50';

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      {/* Avatar circle */}
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all sm:h-20 sm:w-20 ${highlightClass}`}
      >
        {isEmpty ? (
          <Hourglass className="h-6 w-6 text-slate-300" />
        ) : isWinner ? (
          <Trophy className="h-7 w-7 text-emerald-500" />
        ) : isReportedWinner ? (
          <Trophy className="h-7 w-7 text-amber-500" />
        ) : (
          <User className="h-7 w-7 text-slate-400" />
        )}
        {isYou && (
          <span className="absolute -bottom-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            {t('duel.you')}
          </span>
        )}
      </div>

      {/* Label */}
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>

      {/* Address + rep */}
      {isEmpty ? (
        <span className="text-xs text-slate-400">...</span>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <CopyableAddress
            address={address}
            nickname={nickname}
            href={`/profile/${address}`}
            className={
              isWinner
                ? 'font-semibold text-emerald-700'
                : isReportedWinner
                  ? 'font-semibold text-amber-700'
                  : undefined
            }
          />
          <ReputationBadge address={address as `0x${string}`} chainId={DEFAULT_CHAIN_ID} />
        </div>
      )}
    </div>
  );
}

function MutualCancellationCard({
  mode,
  requestedBy,
  requestedAt,
  viewerAddress,
  pendingAction,
  isPending,
  onRequest,
  onAccept,
  onDecline,
  onWithdraw,
  resolveDisplay,
}: {
  mode: 'available' | 'requester' | 'responder' | 'spectator';
  requestedBy?: string;
  requestedAt?: bigint;
  viewerAddress?: string;
  pendingAction: PendingAction;
  isPending: boolean;
  onRequest?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onWithdraw?: () => void;
  resolveDisplay?: (address: string) => string;
}) {
  const { t, language } = useTranslation();
  const isRequester = mode === 'requester';
  const isResponder = mode === 'responder';
  const normalizedViewer = viewerAddress?.toLowerCase();
  const displayRequester = requestedBy ? (resolveDisplay?.(requestedBy) ?? truncateAddress(requestedBy)) : null;
  const formattedRequester = requestedBy
    ? normalizedViewer === requestedBy.toLowerCase()
      ? `${t('duel.you')} • ${displayRequester}`
      : displayRequester
    : null;

  if (mode === 'available') {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
              <Handshake className="h-4 w-4" />
              <span>{t('duel.requestCancellationTitle')}</span>
            </div>
            <p className="text-sm text-violet-800">{t('duel.requestCancellationHint')}</p>
          </div>

          <Button
            size="lg"
            variant="outline"
            className="w-full border-violet-300 bg-white text-violet-900 hover:bg-violet-100 sm:w-auto"
            onClick={onRequest}
            disabled={isPending}
          >
            {pendingAction === 'requestingMutualCancel'
              ? t('status.requestingCancellation')
              : t('action.requestCancellation')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <Handshake className="h-4 w-4" />
            <span>
              {isRequester
                ? t('duel.awaitingCancellationDecision')
                : isResponder
                  ? t('duel.reviewCancellationRequest')
                  : t('duel.cancellationPending')}
            </span>
          </div>
          <p className="text-sm text-violet-800">
            {isRequester
              ? t('duel.mutualCancelRequestedByYou')
              : isResponder
                ? t('duel.mutualCancelRequestedByOpponent')
                : t('duel.cancellationPendingSpectator')}
          </p>
        </div>

        {(formattedRequester || requestedAt) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {formattedRequester && (
              <div className="rounded-xl border border-violet-200 bg-white/80 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-violet-700">
                  {t('duel.mutualCancelRequestedByLabel')}
                </div>
                <p className="font-mono text-sm font-semibold text-slate-900">{formattedRequester}</p>
              </div>
            )}

            {requestedAt && requestedAt > 0n && (
              <div className="rounded-xl border border-violet-200 bg-white/80 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-violet-700">
                  {t('duel.mutualCancelRequestedAtLabel')}
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatDateTime(requestedAt, language)}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {isResponder && (
            <>
              <Button
                size="lg"
                className="flex-1 bg-violet-600 text-white hover:bg-violet-700"
                onClick={onAccept}
                disabled={isPending}
              >
                <Handshake className="mr-2 h-4 w-4" />
                {pendingAction === 'acceptingMutualCancel'
                  ? t('status.acceptingCancellation')
                  : t('action.acceptCancellation')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 border-violet-300 text-violet-900 hover:bg-violet-100"
                onClick={onDecline}
                disabled={isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {pendingAction === 'decliningMutualCancelRequest'
                  ? t('status.processing')
                  : t('action.declineCancellation')}
              </Button>
            </>
          )}

          {isRequester && (
            <Button
              size="lg"
              variant="outline"
              className="w-full border-violet-300 text-violet-900 hover:bg-violet-100 sm:w-auto"
              onClick={onWithdraw}
              disabled={isPending}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              {pendingAction === 'withdrawingMutualCancelRequest'
                ? t('status.withdrawing')
                : t('action.withdrawCancellationRequest')}
            </Button>
          )}
        </div>

        <p className="text-xs text-violet-800">
          {isRequester
            ? t('duel.mutualCancelRequesterHint')
            : isResponder
              ? t('duel.mutualCancelResponderHint')
              : t('duel.cancellationPendingSpectatorHint')}
        </p>
      </div>
    </div>
  );
}

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
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address?.toLowerCase();
  const [inviteSecret, setInviteSecret] = useState<`0x${string}` | null>(null);

  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();
  const { duel, isLoading, isError, refetch } = useDuel(BigInt(duelId), DEFAULT_CHAIN_ID);
  const {
    joinDuel, approveToken, claimVictory, admitDefeat,
    confirmResult, disputeResult, refund, declineDuel, cancelDuel, claimPayout,
    requestMutualCancellation, acceptMutualCancellation, declineMutualCancellation, withdrawMutualCancellationRequest,
    isPending, isConfirming, isSuccess, error: txError, reset,
  } = useDuelActions(DEFAULT_CHAIN_ID);

  const txPending = isPending || isConfirming;

  const nicknameAddresses = useMemo(() => {
    if (!duel) return [];
    return [duel.creator, duel.opponent, duel.claimedBy, duel.claimedWinner, duel.cancelRequestedBy];
  }, [duel]);
  const { resolveDisplay, nicknameByAddress } = useNicknames(nicknameAddresses);

  const [pendingAction, setPendingAction] = useState<PendingAction>('idle');
  const pendingDuelId = useRef<bigint>(0n);
  const pendingInviteSecret = useRef<`0x${string}` | null>(null);

  const chainConfig = SUPPORTED_CHAINS.arbitrumSepolia;
  const contractAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
  const walletAddr = wallets[0]?.address as `0x${string}` | undefined;
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: chainConfig.usdt,
    abi: erc20Abi,
    functionName: 'allowance',
    args: walletAddr && contractAddress ? [walletAddr, contractAddress] : undefined,
    chainId: DEFAULT_CHAIN_ID,
    query: { enabled: !!walletAddr && !!contractAddress },
  });

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

  useEffect(() => {
    if (isSuccess && pendingAction === 'approvingJoin' && pendingInviteSecret.current) {
      refetchAllowance();
      reset();
      setPendingAction('joining');
      appToast.info('toast.joiningDuel');
      joinDuel(pendingDuelId.current, pendingInviteSecret.current);
      return;
    }

    if (!isSuccess || pendingAction === 'idle') return;

    const successToastKey = pendingAction === 'claimingPayout'
      ? 'toast.payoutClaimed'
      : pendingAction === 'requestingMutualCancel'
        ? 'toast.cancellationRequested'
        : pendingAction === 'acceptingMutualCancel'
          ? 'toast.cancellationAccepted'
          : pendingAction === 'decliningMutualCancelRequest'
            ? 'toast.cancellationDeclined'
            : pendingAction === 'withdrawingMutualCancelRequest'
              ? 'toast.cancellationWithdrawn'
              : 'toast.transactionConfirmed';

    appToast.success(successToastKey);
    if (pendingAction === 'joining' || pendingAction === 'claimingPayout') {
      emitBalanceRefresh();
    }
    refetch();
    reset();
    setPendingAction('idle');
  }, [isSuccess, pendingAction, refetchAllowance, reset, joinDuel, appToast, refetch]);

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

  async function handleJoin() {
    if (!duel) return;
    if (!inviteSecret || hashInviteSecret(inviteSecret).toLowerCase() !== duel.inviteHash.toLowerCase()) {
      appToast.error('duel.privateInviteMissing');
      return;
    }

    if (!(await ensureChain())) return;
    pendingDuelId.current = BigInt(duelId);
    pendingInviteSecret.current = inviteSecret;
    const wagerAmount = duel.wagerAmount;
    if (currentAllowance !== undefined && currentAllowance >= wagerAmount) {
      setPendingAction('joining');
      appToast.info('toast.joiningDuel');
      joinDuel(BigInt(duelId), inviteSecret);
    } else {
      setPendingAction('approvingJoin');
      appToast.info('toast.approveUsdtFirst');
      approveToken(chainConfig.usdt, wagerAmount);
    }
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

  async function handleDispute() {
    if (!(await ensureChain())) return;
    setPendingAction('disputingResult');
    appToast.info('toast.disputingResult');
    disputeResult(BigInt(duelId));
  }

  async function handleCancel() {
    if (!(await ensureChain())) return;
    setPendingAction('canceling');
    appToast.info('toast.cancellingDuel');
    cancelDuel(BigInt(duelId));
  }

  async function handleClaimVictory() {
    if (!(await ensureChain())) return;
    setPendingAction('claimVictory');
    appToast.info('toast.reportingVictory');
    claimVictory(BigInt(duelId));
  }

  async function handleAdmitDefeat() {
    if (!(await ensureChain())) return;
    setPendingAction('admitDefeat');
    appToast.info('toast.reportingDefeat');
    admitDefeat(BigInt(duelId));
  }

  async function handleRequestMutualCancellation() {
    if (!(await ensureChain())) return;
    setPendingAction('requestingMutualCancel');
    appToast.info('toast.requestingCancellation');
    requestMutualCancellation(BigInt(duelId));
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

  async function handleConfirmResult() {
    if (!(await ensureChain())) return;
    setPendingAction('confirmingResult');
    appToast.info('toast.confirmingResult');
    confirmResult(BigInt(duelId));
  }

  async function handleRefund() {
    if (!(await ensureChain())) return;
    setPendingAction('refunding');
    appToast.info('toast.unlockingRefunds');
    refund(BigInt(duelId));
  }

  async function handleClaimPayout() {
    if (!duel) return;
    if (!(await ensureChain())) return;
    const claimableAmount = getClaimableAmountForAddress(duel, walletAddress);
    if (claimableAmount <= 0n) return;

    setPendingAction('claimingPayout');
    appToast.info('toast.claimingPayout');
    claimPayout(BigInt(duelId));
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
  const StatusIcon = cfg.icon;
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
  const hasOpponent = duel.opponent !== ZERO;
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
    { label: t('duel.timelineCreated'), timestamp: duel.createdAt },
    duel.fundedAt > 0n ? { label: t('duel.timelineAccepted'), timestamp: duel.fundedAt } : null,
    duel.cancelRequestedAt > 0n ? { label: t('duel.timelineCancellationRequested'), timestamp: duel.cancelRequestedAt } : null,
    duel.claimTimestamp > 0n ? { label: t('duel.timelineResultSubmitted'), timestamp: duel.claimTimestamp } : null,
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
        }
      : null,
  ].filter((event): event is { label: string; timestamp: bigint } => event !== null);

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
        <div className={`bg-gradient-to-r ${cfg.gradient} px-6 py-5 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-5 w-5 opacity-80" />
              <span className="text-lg font-bold">{t('duel.title', { id: duelId })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                {t(cfg.label as Parameters<typeof t>[0])}
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
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
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
                  onClick={handleJoin}
                  disabled={txPending}
                >
                  {pendingAction === 'approvingJoin' || pendingAction === 'joining' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {pendingAction === 'approvingJoin' ? t('status.approving') : t('status.joining')}
                    </span>
                  ) : (
                    <>
                      <Swords className="mr-2 h-4 w-4" />
                      {t('action.join')} — {wagerDisplay} USDT
                    </>
                  )}
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
                  onClaimVictory={handleClaimVictory}
                  onAdmitDefeat={handleAdmitDefeat}
                  isPending={txPending}
                />
                <MutualCancellationCard
                  mode="available"
                  pendingAction={pendingAction}
                  isPending={txPending}
                  onRequest={handleRequestMutualCancellation}
                  resolveDisplay={resolveDisplay}
                />
                {(pendingAction === 'claimVictory' || pendingAction === 'admitDefeat') && (
                  <p className="text-center text-xs text-slate-500">{t('status.processing')}</p>
                )}
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
                onConfirm={handleConfirmResult}
                onDispute={handleDispute}
                onRefund={handleRefund}
                isPending={txPending}
                canConfirm={canManageParticipantDuel && !isClaimAuthor}
                canDispute={canManageParticipantDuel && !isClaimAuthor}
                canRefund={canManageParticipantDuel}
                resolveDisplay={resolveDisplay}
              />
            )}

            {/* Resolved */}
            {isResolved && duel.claimedWinner !== ZERO && (
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
                      onClick={handleClaimPayout}
                      disabled={txPending}
                    >
                      {pendingAction === 'claimingPayout' ? t('status.claiming') : t('action.claimFunds')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
