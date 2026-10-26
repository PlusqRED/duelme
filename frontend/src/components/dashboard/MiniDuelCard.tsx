'use client';

import { useId, useRef } from 'react';
import { CopyInviteButton } from '@/components/dashboard/CopyInviteButton';
import { MiniArena } from '@/components/dashboard/MiniArena';
import { GameTile } from '@/components/identity/GameTile';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { LocaleLink } from '@/components/ui/LocaleLink';
import type { DuelGame } from '@/hooks/useDashboard';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import { useTranslation } from '@/i18n/useTranslation';
import { goKey, otherOf, turnLineKey, turnOf, type MyDuel } from '@/lib/dashboard';
import { isPublicDuel } from '@/lib/invite';
import { cn, formatUSDT } from '@/lib/utils';

/** Cards on the page take their stakes one after another. */
const ARRIVAL_STAGGER_MS = 160;
/** A card calls for the reader once its stakes are in. */
const CALL_AFTER_MS = 1100;

/** Alone on its row of two: what it needs on the left, its arena on the right. */
const WIDE =
  "@min-[660px]/desk:col-span-2 @min-[660px]/desk:grid-cols-[minmax(0,1fr)_minmax(0,400px)] @min-[660px]/desk:grid-rows-[auto_1fr] @min-[660px]/desk:gap-x-7 @min-[660px]/desk:px-6 @min-[660px]/desk:pt-5 @min-[660px]/desk:pb-[18px] @min-[660px]/desk:[grid-template-areas:'head_stage'_'turn_stage']";

interface MiniDuelCardProps {
  entry: MyDuel;
  game: DuelGame | null;
  nameOf: (address: string) => string;
  claimTimeout: number;
  /** Its place on the page, for the order the cards take their stakes in. */
  order: number;
  /** The last card, alone on its row: it takes the whole row. */
  isWide: boolean;
}

/**
 * A duel that is on: its game and stake, a small copy of its arena, what it needs in a line and the
 * way into it. Its edge takes the reader's seat colour while the move is theirs, as the duel page's
 * panel does, and calls twice once its stakes are in.
 */
export function MiniDuelCard({ entry, game, nameOf, claimTimeout, order, isWide }: MiniDuelCardProps) {
  const { t, language } = useTranslation();
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);
  const isSeen = useSeenOnce(ref, 0.3);
  const { duel, phase, seat } = entry;
  const isYourMove = turnOf(entry) === 'you';
  const other = otherOf(entry);
  const delayMs = order * ARRIVAL_STAGGER_MS;

  return (
    <article
      ref={ref}
      aria-labelledby={titleId}
      data-tone={isYourMove ? seat : undefined}
      className={cn(
        'relative grid min-w-0 grid-rows-[auto_1fr_auto] gap-1 rounded-3xl border-2 border-line bg-paper p-4 pb-3.5 shadow-stage [--tone:var(--color-line)]',
        'data-[tone=creator]:border-red data-[tone=creator]:[--tone:var(--color-red)] data-[tone=opponent]:border-blue data-[tone=opponent]:[--tone:var(--color-blue)]',
        isWide && WIDE
      )}
    >
      {isYourMove && isSeen && (
        <span
          aria-hidden="true"
          style={{ '--delay': `${delayMs + CALL_AFTER_MS}ms` }}
          className="pointer-events-none absolute -inset-0.5 -z-1 animate-call rounded-[26px] bg-(--tone) opacity-0 [animation-delay:var(--delay)]"
        />
      )}
      <header className={cn('flex items-center gap-3', isWide && '@min-[660px]/desk:self-start @min-[660px]/desk:[grid-area:head]')}>
        <GameTile name={game?.name ?? null} category={game?.category} className="size-10 rounded-xl text-note" />
        <div className="min-w-0">
          <h3 className="text-[1.0625rem]/[1.25] tracking-[-0.01em]">
            <LocaleLink
              id={titleId}
              href={`/duel/${duel.id}`}
              aria-label={game ? t('dash.card.title', { id: duel.id, game: game.name }) : undefined}
              className="text-ink no-underline decoration-2 underline-offset-4 hover:underline"
            >
              {game?.name ?? t('duel.title', { id: duel.id })}
            </LocaleLink>
          </h3>
          <p className="flex flex-wrap gap-x-3 text-note text-ink-3 tabular-nums">
            {game && <span>{t('duel.title', { id: duel.id })}</span>}
            <span>{t('dash.card.stake', { amount: formatUSDT(duel.wagerAmount, language) })}</span>
          </p>
        </div>
      </header>
      <div className={cn('flex justify-center', isWide && '@min-[660px]/desk:self-center @min-[660px]/desk:[grid-area:stage]')}>
        <MiniArena entry={entry} claimTimeout={claimTimeout} isSeen={isSeen} delayMs={delayMs} />
      </div>
      <div
        className={cn(
          'mt-2 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 border-t border-line pt-3',
          isWide && '@min-[660px]/desk:mt-0 @min-[660px]/desk:flex-col @min-[660px]/desk:items-start @min-[660px]/desk:justify-end @min-[660px]/desk:border-t-0 @min-[660px]/desk:pt-0 @min-[660px]/desk:[grid-area:turn]'
        )}
      >
        <p className={cn('flex-[1_1_200px] text-body-sm/[1.4] text-ink-2', isWide && '@min-[660px]/desk:max-w-[34ch] @min-[660px]/desk:flex-none @min-[660px]/desk:text-base')}>
          {t(turnLineKey(entry), { other: other ? nameOf(other) : '' })}
        </p>
        <div className="flex flex-wrap gap-2">
          {phase === 'created' && !isPublicDuel(duel.inviteHash) && <CopyInviteButton duelId={duel.id} />}
          <LocaleLink href={`/duel/${duel.id}`} className={buttonVariants({ variant: isYourMove ? 'navy' : 'paper', size: 'sm', className: 'px-3.5' })}>
            {t(goKey(entry))}
            <Icon name="chevron-right" className="size-[18px]" />
          </LocaleLink>
        </div>
      </div>
    </article>
  );
}
