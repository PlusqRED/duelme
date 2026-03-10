'use client';

import { use, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShareLink } from '@/components/duel/ShareLink';
import { ClaimButtons } from '@/components/duel/ClaimButtons';
import { ConfirmResult } from '@/components/duel/ConfirmResult';
import { useTranslation } from '@/i18n/useTranslation';
import { DuelState, erc20Abi } from '@/lib/contracts';
import { truncateAddress } from '@/lib/utils';
import { SUPPORTED_CHAINS, DUELME_ADDRESSES } from '@/lib/constants';
import { useDuel } from '@/hooks/useDuel';
import { useDuelActions } from '@/hooks/useDuelActions';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSwitchChain, useAccount, useReadContract } from 'wagmi';
import { Clock, Trophy, ArrowLeft, XCircle, RotateCcw, Swords, LogIn, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<
  DuelState,
  { icon: React.ElementType; colorClass: string }
> = {
  [DuelState.Created]: { icon: Clock, colorClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  [DuelState.Funded]: { icon: Clock, colorClass: 'bg-green-50 text-green-700 border-green-200' },
  [DuelState.WinnerClaimed]: { icon: Clock, colorClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  [DuelState.Resolved]: { icon: Trophy, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  [DuelState.Refunded]: { icon: RotateCcw, colorClass: 'bg-slate-50 text-slate-600 border-slate-200' },
  [DuelState.Cancelled]: { icon: XCircle, colorClass: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const STATUS_LABELS: Record<DuelState, string> = {
  [DuelState.Created]: 'duel.waiting',
  [DuelState.Funded]: 'duel.inProgress',
  [DuelState.WinnerClaimed]: 'duel.waitingConfirm',
  [DuelState.Resolved]: 'duel.resolved',
  [DuelState.Refunded]: 'duel.refunded',
  [DuelState.Cancelled]: 'duel.cancelled',
};

// TODO: detect chain from URL param or duel lookup across chains
const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.arbitrumSepolia.id;

function CopyableAddress({ address, className }: { address: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`group inline-flex items-center gap-1.5 font-mono text-sm ${className ?? 'text-slate-700'}`}
      onClick={() => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title={address}
    >
      <span className="truncate">{truncateAddress(address)}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function OpponentInviteView({
  creator,
  wagerDisplay,
  authenticated,
  txPending,
  joinStep,
  onJoin,
  onLogin,
  t,
}: {
  creator: string;
  wagerDisplay: number;
  authenticated: boolean;
  txPending: boolean;
  joinStep: 'idle' | 'approving' | 'joining';
  onJoin: () => void;
  onLogin: () => void;
  t: (key: Parameters<ReturnType<typeof useTranslation>['t']>[0]) => string;
}) {
  const [copied, setCopied] = useState(false);
  const potDisplay = wagerDisplay * 2;

  return (
    <div className="flex flex-col gap-5">
      {/* Challenge header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
          <Swords className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900">
            {t('action.joinDesc')}
          </p>
        </div>
      </div>

      {/* Creator address — full, copyable */}
      <div className="flex flex-col gap-1 rounded-lg bg-slate-50 px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {t('duel.creator')}
        </span>
        <button
          type="button"
          className="group inline-flex items-center gap-2 text-left"
          onClick={() => {
            navigator.clipboard.writeText(creator);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <span className="break-all font-mono text-sm text-slate-700">
            {creator}
          </span>
          {copied ? (
            <Check className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
          )}
        </button>
      </div>

      {/* Wager + Pot in a single row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-lg bg-slate-50 px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {t('duel.wager')}
          </span>
          <span className="text-xl font-bold text-slate-900">{wagerDisplay} USDT</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-indigo-50 px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-indigo-400">
            {t('duel.pot')}
          </span>
          <span className="text-xl font-bold text-indigo-600">{potDisplay} USDT</span>
        </div>
      </div>

      {/* Action button */}
      {authenticated ? (
        <Button
          size="lg"
          className="h-12 w-full bg-indigo-600 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
          onClick={onJoin}
          disabled={txPending}
        >
          {txPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {joinStep === 'approving' ? 'Approving...' : 'Joining...'}
            </span>
          ) : (
            <>
              <Swords className="mr-2 h-4 w-4" />
              {t('action.join')} — {wagerDisplay} USDT
            </>
          )}
        </Button>
      ) : (
        <Button
          size="lg"
          className="h-12 w-full bg-indigo-600 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
          onClick={onLogin}
        >
          <LogIn className="mr-2 h-4 w-4" />
          {t('action.loginToJoin')}
        </Button>
      )}
    </div>
  );
}

export default function DuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useTranslation();
  const duelId = parseInt(id, 10);

  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address?.toLowerCase();

  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();
  const { duel, isLoading, isError, refetch } = useDuel(BigInt(duelId), DEFAULT_CHAIN_ID);
  const {
    joinDuel,
    approveToken,
    claimVictory,
    admitDefeat,
    confirmResult,
    refund,
    cancelDuel,
    isPending,
    isConfirming,
    isSuccess,
    error: txError,
    reset,
  } = useDuelActions(DEFAULT_CHAIN_ID);

  const txPending = isPending || isConfirming;

  // Approve-then-join flow
  const [joinStep, setJoinStep] = useState<'idle' | 'approving' | 'joining'>('idle');
  const pendingDuelId = useRef<bigint>(0n);

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

  // After approve succeeds → join
  useEffect(() => {
    if (isSuccess && joinStep === 'approving') {
      refetchAllowance();
      reset();
      setJoinStep('joining');
      toast.info('Joining duel...');
      joinDuel(pendingDuelId.current);
    }
  }, [isSuccess, joinStep, refetchAllowance, reset, joinDuel]);

  // Refetch duel data after any other successful transaction (join, cancel, claim, etc.)
  useEffect(() => {
    if (isSuccess && (joinStep === 'joining' || joinStep === 'idle')) {
      toast.success('Transaction confirmed!');
      refetch();
      reset();
      setJoinStep('idle');
    }
  }, [isSuccess, joinStep, refetch, reset]);

  // Show transaction errors
  useEffect(() => {
    if (txError) {
      setJoinStep('idle');
      const msg = txError.message;
      if (msg.includes('User rejected') || msg.includes('denied')) {
        toast.error('Transaction rejected');
      } else {
        toast.error('shortMessage' in txError ? String(txError.shortMessage) : msg);
      }
    }
  }, [txError]);

  async function ensureChain() {
    if (connectedChainId !== DEFAULT_CHAIN_ID) {
      await switchChainAsync({ chainId: DEFAULT_CHAIN_ID });
    }
  }

  async function handleJoin() {
    if (!duel) return;
    await ensureChain();
    pendingDuelId.current = BigInt(duelId);
    const wagerAmount = duel.wagerAmount;

    if (currentAllowance !== undefined && currentAllowance >= wagerAmount) {
      setJoinStep('joining');
      toast.info('Joining duel...');
      joinDuel(BigInt(duelId));
    } else {
      setJoinStep('approving');
      toast.info('Approve USDT spending first...');
      approveToken(chainConfig.usdt, wagerAmount);
    }
  }

  const ZERO = '0x0000000000000000000000000000000000000000';

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
        <p className="text-slate-500">Duel not found or contract not deployed yet.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const state = duel.state;
  const statusConfig = STATUS_CONFIG[state];
  const StatusIcon = statusConfig.icon;
  const isWaitingOpponent = state === DuelState.Created;
  const isFunded = state === DuelState.Funded;
  const isWinnerClaimed = state === DuelState.WinnerClaimed;
  const isResolved = state === DuelState.Resolved;
  const isRefunded = state === DuelState.Refunded;
  const isCancelled = state === DuelState.Cancelled;

  const isCreator = walletAddress === duel.creator.toLowerCase();
  const isOpponent = walletAddress === duel.opponent.toLowerCase();
  const isParticipant = isCreator || isOpponent;
  const isClaimAuthor = walletAddress === duel.claimedBy.toLowerCase();

  // Convert wagerAmount from raw (6 decimals) to display
  const wagerDisplay = Number(duel.wagerAmount) / 1e6;
  const potDisplay = duel.opponent !== ZERO ? wagerDisplay * 2 : wagerDisplay;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.dashboard')}
      </Link>

      {/* Duel card */}
      <Card className="card-glow border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-900">
            Duel #{duelId}
          </CardTitle>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig.colorClass}`}
          >
            <StatusIcon className="h-3 w-3" />
            {t(STATUS_LABELS[state] as Parameters<typeof t>[0])}
          </span>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Opponent/guest invitation view — single card, no duplication */}
          {isWaitingOpponent && !isCreator ? (
            <OpponentInviteView
              creator={duel.creator}
              wagerDisplay={wagerDisplay}
              authenticated={authenticated}
              txPending={txPending}
              joinStep={joinStep}
              onJoin={handleJoin}
              onLogin={login}
              t={t}
            />
          ) : (
            <>
              {/* Wager info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('duel.wager')}
                  </span>
                  <span className="text-xl font-bold text-slate-900">
                    {wagerDisplay} USDT
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-indigo-50 p-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                    {t('duel.pot')}
                  </span>
                  <span className="text-xl font-bold text-indigo-600">
                    {potDisplay} USDT
                  </span>
                </div>
              </div>

              {/* Players */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('duel.creator')}
                  </span>
                  <CopyableAddress address={duel.creator} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('duel.opponent')}
                  </span>
                  {duel.opponent === ZERO ? (
                    <span className="font-mono text-sm text-slate-700">...</span>
                  ) : (
                    <CopyableAddress address={duel.opponent} />
                  )}
                </div>
              </div>

              {/* Creator view — share link + cancel */}
              {isWaitingOpponent && isCreator && (
                <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
                  <ShareLink duelId={duelId} />
                </div>
              )}
            </>
          )}

          {/* Funded — show claim buttons (only for participants) */}
          {isFunded && isParticipant && (
            <div className="border-t border-slate-100 pt-4">
              <ClaimButtons
                onClaimVictory={async () => { await ensureChain(); claimVictory(BigInt(duelId)); }}
                onAdmitDefeat={async () => { await ensureChain(); admitDefeat(BigInt(duelId)); }}
                isPending={txPending}
              />
            </div>
          )}

          {/* WinnerClaimed — show confirm result (only for the OTHER player) */}
          {isWinnerClaimed && (
            <div className="border-t border-slate-100 pt-4">
              <ConfirmResult
                claimedBy={duel.claimedBy}
                claimTimestamp={Number(duel.claimTimestamp)}
                onConfirm={async () => { await ensureChain(); confirmResult(BigInt(duelId)); }}
                onRefund={async () => { await ensureChain(); refund(BigInt(duelId)); }}
                isPending={txPending}
                canConfirm={isParticipant && !isClaimAuthor}
                canRefund={true}
              />
            </div>
          )}

          {/* Resolved — show winner */}
          {isResolved && duel.claimedWinner !== ZERO && (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
                <Trophy className="h-5 w-5 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-emerald-600">
                    {t('duel.winner')}
                  </span>
                  <CopyableAddress address={duel.claimedWinner} className="font-semibold text-emerald-700" />
                </div>
              </div>
            </div>
          )}

          {/* Refunded */}
          {isRefunded && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 border-t border-slate-100">
              <RotateCcw className="h-5 w-5 text-slate-500" />
              <span className="text-sm text-slate-600">{t('duel.refunded')}</span>
            </div>
          )}

          {/* Cancelled */}
          {isCancelled && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 border-t border-slate-100">
              <XCircle className="h-5 w-5 text-slate-400" />
              <span className="text-sm text-slate-500">{t('duel.cancelled')}</span>
            </div>
          )}

          {/* Cancel button (only for creator when waiting for opponent) */}
          {isWaitingOpponent && isCreator && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={async () => { await ensureChain(); cancelDuel(BigInt(duelId)); }}
              disabled={txPending}
            >
              {t('action.cancel')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
