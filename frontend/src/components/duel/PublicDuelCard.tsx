'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CircleDashed,
  Clock,
  Globe2,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { GameBadge } from '@/components/game/GameBadge';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { truncateUnicode } from '@/lib/duel';
import { formatPublicDuelAmount, type EnrichedDuel } from '@/lib/publicDuelsFilters';
import { getReputationLabelKey, type ReputationLevel } from '@/lib/reputation';
import { cn, formatDateTime } from '@/lib/utils';

interface PublicDuelCardProps {
  duel: EnrichedDuel;
  timeAgo: (timestamp: bigint) => string;
  variant?: 'compact' | 'full';
  className?: string;
  viewerAddress?: `0x${string}`;
  isViewerIdentityPending?: boolean;
}

const HONOR_CONFIG: Record<
  ReputationLevel,
  {
    icon: LucideIcon;
    className: string;
  }
> = {
  new: {
    icon: Sparkles,
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  honorable: {
    icon: ShieldCheck,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  fair: {
    icon: ShieldQuestion,
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  unreliable: {
    icon: ShieldAlert,
    className: 'border-red-200 bg-red-50 text-red-700',
  },
};

export function PublicDuelCard({
  duel,
  timeAgo,
  variant = 'full',
  className,
  viewerAddress,
  isViewerIdentityPending = false,
}: PublicDuelCardProps) {
  const { t, language } = useTranslation();
  const compact = variant === 'compact';
  const showMessage = hasVisibleDuelMessage(duel.message);
  const isOwnDuel = viewerAddress === duel.creator.toLowerCase();
  const actionLabel = isOwnDuel || isViewerIdentityPending
    ? t('action.viewDuel')
    : t('action.join');
  const gameCategoryLabel = duel.gameCategory
    ? t(`category.${duel.gameCategory}` as TranslationKey)
    : null;
  const wager = formatPublicDuelAmount(duel.wager, language);
  const pot = formatPublicDuelAmount(duel.wager * 2, language);

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-200/70 bg-white shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md',
        compact ? 'min-h-[22rem]' : 'min-h-[24rem]',
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500" />

      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
              <Globe2 className="h-3 w-3" aria-hidden="true" />
              {t('publicDuels.openChallenge')}
            </span>
            {duel.gameName ? (
              <GameBadge gameName={duel.gameName} gameSlug={duel.gameSlug ?? undefined} />
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                {t('publicDuels.noGame')}
              </span>
            )}
            {gameCategoryLabel && (
              <span className="text-xs text-slate-400">{gameCategoryLabel}</span>
            )}
          </div>
          <span
            className="inline-flex items-center gap-1 text-xs text-slate-400"
            title={formatDateTime(duel.createdAt, language)}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {timeAgo(duel.createdAt)}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
          #{duel.id}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-emerald-700">
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
            {t('publicDuels.challengeNote')}
          </div>
          <p
            className={cn(
              'text-sm leading-relaxed text-slate-700',
              showMessage && 'italic',
              compact ? 'line-clamp-2' : 'line-clamp-3',
            )}
          >
            {showMessage ? (
              <>
                &ldquo;{truncateUnicode(duel.message, compact ? 96 : 150)}&rdquo;
              </>
            ) : (
              t('publicDuels.fallbackNote')
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3">
            <span className="text-[10px] font-semibold uppercase text-slate-400">
              {t('duel.creator')}
            </span>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/profile/${duel.creator}`}
                    className={cn(
                      'block truncate text-sm font-semibold text-slate-900 transition-colors hover:text-indigo-600',
                      duel.creatorName.startsWith('0x') && 'font-mono',
                    )}
                    title={duel.creator}
                    aria-label={t('publicDuels.profileAria', { player: duel.creatorName })}
                  >
                    {duel.creatorName}
                  </Link>
                  <HonorBadge duel={duel} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center" aria-hidden="true">
            <span className="vs-badge">VS</span>
          </div>

          <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600">
                <CircleDashed className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-900">
                  {t('publicDuels.openSlot')}
                </p>
                <p className="line-clamp-1 text-xs text-emerald-700/80">
                  {t('publicDuels.openSlotHint')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-100 px-4 py-3">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <AmountStat label={t('publicDuels.requiredStake')} value={wager} />
          <AmountStat label={t('publicDuels.potentialPot')} value={pot} />
        </div>
        <Link
          href={`/duel/${duel.id}`}
          className={buttonVariants({
            size: compact ? 'default' : 'lg',
            className:
              'w-full bg-slate-950 text-white hover:bg-slate-800',
          })}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function HonorBadge({ duel }: { duel: EnrichedDuel }) {
  const { t } = useTranslation();
  const level = duel.reputationStats?.level ?? duel.reputation ?? 'new';
  const config = HONOR_CONFIG[level];
  const Icon = config.icon;
  const stats = duel.reputationStats;

  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
          config.className,
        )}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        {t(getReputationLabelKey(level))}
      </span>
      <span className="truncate text-[11px] text-slate-400">
        {stats && stats.total > 0
          ? t('publicDuels.honorStats', { honored: stats.honored, total: stats.total })
          : t('publicDuels.noHonorHistory')}
      </span>
    </div>
  );
}

function AmountStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="truncate text-[10px] font-semibold uppercase text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">
        {value} <span className="text-xs font-medium text-slate-400">USDT</span>
      </p>
    </div>
  );
}
