'use client';

import Link from 'next/link';
import { OpenSeat } from '@/components/arena/OpenSeat';
import { Avatar } from '@/components/identity/Avatar';
import { GameTile } from '@/components/identity/GameTile';
import { ReputationPill } from '@/components/identity/ReputationPill';
import { buttonVariants } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { useTranslation } from '@/i18n/useTranslation';
import { truncateUnicode } from '@/lib/duel';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { categoryKey } from '@/lib/game';
import type { EnrichedDuel } from '@/lib/publicDuelsFilters';
import { cn, formatDateTime, formatUSDT } from '@/lib/utils';

/** Long enough for a challenge in a few words; a longer note is cut, the duel page has it all. */
const NOTE_CHARACTERS = 96;

interface OpenDuelCardProps {
  duel: EnrichedDuel;
  /** One of a lobby's equal cards: narrower, so the seats say less. */
  isCompact: boolean;
  /** The reader created it, or who they are is still loading: the button opens it rather than joining. */
  isOwn: boolean;
  timeAgo: (timestamp: bigint) => string;
  className?: string;
}

/**
 * An open duel as a table waiting for its second player: the game, the creator in red with their
 * note and their record, the empty blue seat, what joining costs and what the pot becomes, and the
 * way in. Pointing at it puts the reader in the open seat.
 */
export function OpenDuelCard({ duel, isCompact, isOwn, timeAgo, className }: OpenDuelCardProps) {
  const { t, language } = useTranslation();
  const titleId = `open-duel-${duel.id}`;
  // A record that could not be read shows no level rather than New: New would tell the reader
  // something about the creator nobody knows.
  const stats = duel.reputationStats;
  const stake = formatUSDT(duel.wagerAmount, language);

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'group/duel grid content-start gap-5 rounded-3xl border border-line bg-paper p-[clamp(18px,2.4vw,26px)]',
        isCompact && 'grid-rows-[auto_1fr_auto_auto]',
        className
      )}
    >
      <header className="flex items-center gap-3">
        <GameTile name={duel.gameName} category={duel.gameCategory} />
        <div className="min-w-0">
          <h3 id={titleId} className="truncate text-xl">
            {duel.gameName ?? t('publicDuels.noGame')}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-3">
            {duel.gameCategory && <Chip>{t(categoryKey(duel.gameCategory))}</Chip>}
            <span title={formatDateTime(duel.createdAt, language)}>{timeAgo(duel.createdAt)}</span>
          </p>
        </div>
        <span className="ml-auto font-bold text-ink-3 tabular-nums">#{duel.id}</span>
      </header>

      <div
        className={cn(
          'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 rounded-[20px] bg-canvas px-3 py-[18px] [grid-template-areas:"note_._."_"a_vs_b"]',
          // Equal cards in a row keep their avatars level whatever their notes, and a note may
          // reach past its column so a short one stays on one line.
          isCompact && 'grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)] content-end'
        )}
      >
        {hasVisibleDuelMessage(duel.message) && (
          <p
            className={cn(
              'relative mb-2.5 max-w-full justify-self-center rounded-[14px] border-[1.5px] border-red bg-paper px-3 py-2 text-body-sm/[1.35] font-label [overflow-wrap:anywhere] shadow-[0_3px_0_var(--color-red)] [grid-area:note]',
              'after:absolute after:top-full after:left-1/2 after:-mt-1 after:size-2.5 after:-translate-x-1/2 after:rotate-45 after:border-r-[1.5px] after:border-b-[1.5px] after:border-red after:bg-paper',
              isCompact && 'w-max max-w-[calc(100%+56px)]'
            )}
          >
            {truncateUnicode(duel.message, NOTE_CHARACTERS)}
          </p>
        )}
        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center [grid-area:a]">
          <Avatar address={duel.creator} tone="red" className="size-16" />
          <p className={cn('font-bold tabular-nums [overflow-wrap:anywhere]', isCompact && 'text-body-sm whitespace-nowrap')}>
            {duel.creatorName}
          </p>
          {stats && (
            <p className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-note text-ink-3">
              <ReputationPill level={stats.level} />
              <span>
                {stats.total > 0
                  ? t('publicDuels.honorStats', { honored: stats.honored, total: stats.total })
                  : t('publicDuels.noHonorHistory')}
              </span>
            </p>
          )}
        </div>
        <span aria-hidden="true" className="mt-[22px] text-sm font-extrabold text-ink-3 [grid-area:vs]">
          vs
        </span>
        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center [grid-area:b]">
          <OpenSeat you={t('sim.you')} className="size-16" />
          <p className={cn('font-bold text-blue-deep', isCompact && 'text-body-sm whitespace-nowrap')}>
            {t(isCompact ? 'sim.openSeat' : 'publicDuels.openSlot')}
          </p>
          {!isCompact && <p className="max-w-[24ch] text-note text-ink-3">{t('publicDuels.openSlotHint')}</p>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Amount label={t('publicDuels.requiredStake')} amount={stake} />
        <Amount label={t('publicDuels.potentialPot')} amount={formatUSDT(duel.wagerAmount * 2n, language)} />
      </dl>

      <Link href={`/duel/${duel.id}`} className={buttonVariants({ size: 'lg', className: 'w-full' })}>
        {isOwn ? t('action.viewDuel') : t('publicDuels.joinFor', { amount: stake })}
      </Link>
    </article>
  );
}

function Amount({ label, amount }: { label: string; amount: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="text-figure/[1.1] font-extrabold tracking-[-0.03em] tabular-nums">
        {amount}
        <small className="ml-1 text-sm font-label tracking-normal text-ink-3">USDT</small>
      </dd>
    </div>
  );
}
