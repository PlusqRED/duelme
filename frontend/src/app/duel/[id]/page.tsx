'use client';

import { use, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShareLink } from '@/components/duel/ShareLink';
import { ClaimButtons } from '@/components/duel/ClaimButtons';
import { ConfirmResult } from '@/components/duel/ConfirmResult';
import { ReputationBadge } from '@/components/duel/ReputationBadge';
import { useTranslation } from '@/i18n/useTranslation';
import { DuelState, erc20Abi } from '@/lib/contracts';
import { truncateAddress } from '@/lib/utils';
import { SUPPORTED_CHAINS, DUELME_ADDRESSES } from '@/lib/constants';
import { useDuel } from '@/hooks/useDuel';
import { useDuelActions } from '@/hooks/useDuelActions';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSwitchChain, useAccount, useReadContract } from 'wagmi';
import {
  Clock, Trophy, ArrowLeft, XCircle, RotateCcw,
  Swords, LogIn, Copy, Check, User, Hourglass,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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
};

const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.arbitrumSepolia.id;
const ZERO = '0x0000000000000000000000000000000000000000';

/* ── Copyable address ── */
function CopyableAddress({ address, className }: { address: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`group inline-flex items-center gap-1.5 font-mono text-sm transition-colors ${className ?? 'text-slate-600 hover:text-slate-900'}`}
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
        <Copy className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

/* ── Player card (VS arena) ── */
function PlayerCard({
  address,
  label,
  isWinner,
  isYou,
  isEmpty,
}: {
  address: string;
  label: string;
  isWinner: boolean;
  isYou: boolean;
  isEmpty: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      {/* Avatar circle */}
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all sm:h-20 sm:w-20 ${
          isWinner
            ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
            : isEmpty
              ? 'border-dashed border-slate-300 bg-slate-50'
              : 'border-slate-200 bg-slate-50'
        }`}
      >
        {isEmpty ? (
          <Hourglass className="h-6 w-6 text-slate-300" />
        ) : isWinner ? (
          <Trophy className="h-7 w-7 text-emerald-500" />
        ) : (
          <User className="h-7 w-7 text-slate-400" />
        )}
        {isYou && (
          <span className="absolute -bottom-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            you
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
          <CopyableAddress address={address} className={isWinner ? 'font-semibold text-emerald-700' : undefined} />
          <ReputationBadge address={address as `0x${string}`} chainId={DEFAULT_CHAIN_ID} />
        </div>
      )}
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
  const { t } = useTranslation();
  const duelId = parseInt(id, 10);

  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address?.toLowerCase();

  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();
  const { duel, isLoading, isError, refetch } = useDuel(BigInt(duelId), DEFAULT_CHAIN_ID);
  const {
    joinDuel, approveToken, claimVictory, admitDefeat,
    confirmResult, refund, cancelDuel,
    isPending, isConfirming, isSuccess, error: txError, reset,
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

  useEffect(() => {
    if (isSuccess && joinStep === 'approving') {
      refetchAllowance();
      reset();
      setJoinStep('joining');
      toast.info('Joining duel...');
      joinDuel(pendingDuelId.current);
    }
  }, [isSuccess, joinStep, refetchAllowance, reset, joinDuel]);

  useEffect(() => {
    if (isSuccess && (joinStep === 'joining' || joinStep === 'idle')) {
      toast.success('Transaction confirmed!');
      refetch();
      reset();
      setJoinStep('idle');
    }
  }, [isSuccess, joinStep, refetch, reset]);

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
        <p className="text-slate-500">Duel not found or contract not deployed yet.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Back to home
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

  const isCreator = walletAddress === duel.creator.toLowerCase();
  const isOpponent = walletAddress === duel.opponent.toLowerCase();
  const isParticipant = isCreator || isOpponent;
  const isClaimAuthor = walletAddress === duel.claimedBy.toLowerCase();

  const wagerDisplay = Number(duel.wagerAmount) / 1e6;
  const hasOpponent = duel.opponent !== ZERO;
  const potDisplay = hasOpponent ? wagerDisplay * 2 : wagerDisplay;
  const creatorIsWinner = isResolved && duel.claimedWinner.toLowerCase() === duel.creator.toLowerCase();
  const opponentIsWinner = isResolved && hasOpponent && duel.claimedWinner.toLowerCase() === duel.opponent.toLowerCase();

  /* ── Render ── */
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

      <div className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* ── Status header with gradient ── */}
        <div className={`bg-gradient-to-r ${cfg.gradient} px-6 py-5 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-5 w-5 opacity-80" />
              <span className="text-lg font-bold">Duel #{duelId}</span>
            </div>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              {t(cfg.label as Parameters<typeof t>[0])}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-0">
          {/* ── VS Arena ── */}
          <div className="flex items-center justify-center gap-4 px-6 py-8 sm:gap-8">
            <PlayerCard
              address={duel.creator}
              label={t('duel.creator')}
              isWinner={creatorIsWinner}
              isYou={isCreator}
              isEmpty={false}
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
              isYou={isOpponent}
              isEmpty={!hasOpponent}
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

          {/* ── Actions zone ── */}
          <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-5">

            {/* Created → Creator: share + cancel */}
            {isWaitingOpponent && isCreator && (
              <>
                <ShareLink duelId={duelId} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-center text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={async () => { await ensureChain(); cancelDuel(BigInt(duelId)); }}
                  disabled={txPending}
                >
                  {t('action.cancel')}
                </Button>
              </>
            )}

            {/* Created → Opponent: join */}
            {isWaitingOpponent && !isCreator && authenticated && (
              <Button
                size="lg"
                className="h-12 w-full bg-indigo-600 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                onClick={handleJoin}
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
            )}

            {/* Created → Guest: login */}
            {isWaitingOpponent && !isCreator && !authenticated && (
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
            {isFunded && isParticipant && (
              <ClaimButtons
                onClaimVictory={async () => { await ensureChain(); claimVictory(BigInt(duelId)); }}
                onAdmitDefeat={async () => { await ensureChain(); admitDefeat(BigInt(duelId)); }}
                isPending={txPending}
              />
            )}

            {/* WinnerClaimed → confirm */}
            {isWinnerClaimed && (
              <ConfirmResult
                claimedBy={duel.claimedBy}
                claimTimestamp={Number(duel.claimTimestamp)}
                onConfirm={async () => { await ensureChain(); confirmResult(BigInt(duelId)); }}
                onRefund={async () => { await ensureChain(); refund(BigInt(duelId)); }}
                isPending={txPending}
                canConfirm={authenticated && isParticipant && !isClaimAuthor}
                canRefund={authenticated && isParticipant}
              />
            )}

            {/* Resolved */}
            {isResolved && duel.claimedWinner !== ZERO && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-4">
                <Trophy className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">
                  {truncateAddress(duel.claimedWinner)} {t('recent.won')}!
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
          </div>
        </div>
      </div>
    </div>
  );
}
