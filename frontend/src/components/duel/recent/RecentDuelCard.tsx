'use client';

import Link from 'next/link';
import { ArrowRight, Link2, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ReputationBadge } from '@/components/duel/ReputationBadge';
import { GameBadge } from '@/components/game/GameBadge';
import type { RecentDuel } from '@/hooks/useRecentDuels';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { useTranslation } from '@/i18n/useTranslation';
import { DuelState } from '@/lib/contracts';
import { isDuelClaimTimedOut, truncateUnicode } from '@/lib/duel';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { DUEL_STATE_CONFIG, TIMED_OUT_CONFIG } from '@/lib/duelStateColors';
import { cn, formatDateTime } from '@/lib/utils';

interface RecentDuelCardProps {
  duel: RecentDuel;
  gameName?: string | null;
  gameSlug?: string | null;
  resolveDisplay: (address: string) => string;
  nicknameByAddress: Record<string, string | null>;
}

export function RecentDuelCard({
  duel,
  gameName,
  gameSlug,
  resolveDisplay,
  nicknameByAddress,
}: RecentDuelCardProps) {
  const { t, language } = useTranslation();
  const timeAgo = useTimeAgo();

  const isTimedOut =
    duel.state === DuelState.WinnerClaimed && isDuelClaimTimedOut(duel.claimTimestamp);
  const stateConfig = isTimedOut ? TIMED_OUT_CONFIG : DUEL_STATE_CONFIG[duel.state];
  const hasWinner = duel.state === DuelState.Resolved;
  const isPlayer1Winner =
    hasWinner && duel.winner.toLowerCase() === duel.player1.toLowerCase();
  const isPlayer2Winner = hasWinner && !isPlayer1Winner;
  const showMessage = hasVisibleDuelMessage(duel.message);

  return (
    <Link
      href={`/duel/${duel.id}`}
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-l-4 border-slate-200 bg-white shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md',
        stateConfig.accentClass,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700"
            title={`Duel #${duel.id}`}
          >
            <Link2 className="h-3 w-3" aria-hidden="true" />
            #{duel.id}
          </span>
          {gameName ? (
            <GameBadge gameName={gameName} gameSlug={gameSlug ?? undefined} />
          ) : (
            <Badge variant="outline" className="text-xs">
              {duel.chainName}
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end leading-tight">
          <span className="text-base font-bold text-slate-900">
            {duel.wager} <span className="text-xs font-medium text-slate-400">USDT</span>
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <PlayerRow
          address={duel.player1}
          chainId={duel.chainId}
          isWinner={isPlayer1Winner}
          isLoser={isPlayer2Winner}
          resolveDisplay={resolveDisplay}
          nicknameByAddress={nicknameByAddress}
        />

        <div className="flex items-center justify-center" aria-hidden="true">
          <span className="vs-badge">VS</span>
        </div>

        <PlayerRow
          address={duel.player2}
          chainId={duel.chainId}
          isWinner={isPlayer2Winner}
          isLoser={isPlayer1Winner}
          resolveDisplay={resolveDisplay}
          nicknameByAddress={nicknameByAddress}
        />

        {showMessage && (
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="line-clamp-2 text-xs italic text-slate-600">
              &ldquo;{truncateUnicode(duel.message, 80)}&rdquo;
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
            stateConfig.colorClass,
          )}
        >
          {t(stateConfig.key)}
        </span>
        <span
          className="text-xs text-slate-500"
          title={formatDateTime(duel.lastEventAt, language)}
        >
          {timeAgo(duel.lastEventAt)}
        </span>
        <ArrowRight
          className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

interface PlayerRowProps {
  address: `0x${string}`;
  chainId: number;
  isWinner: boolean;
  isLoser: boolean;
  resolveDisplay: (address: string) => string;
  nicknameByAddress: Record<string, string | null>;
}

function PlayerRow({
  address,
  chainId,
  isWinner,
  isLoser,
  resolveDisplay,
  nicknameByAddress,
}: PlayerRowProps) {
  const hasNickname = !!nicknameByAddress[address.toLowerCase()];

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <ReputationBadge address={address} chainId={chainId} />
        <Link
          href={`/profile/${address}`}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'truncate text-sm transition-colors hover:text-indigo-600',
            !hasNickname && 'font-mono',
            isWinner && 'font-semibold text-slate-900',
            isLoser && 'text-slate-400',
            !isWinner && !isLoser && 'text-slate-700',
          )}
        >
          {resolveDisplay(address)}
        </Link>
      </div>
      {isWinner && (
        <Trophy className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
      )}
    </div>
  );
}
