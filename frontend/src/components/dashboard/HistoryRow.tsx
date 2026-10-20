'use client';

import Link from 'next/link';
import { Avatar } from '@/components/identity/Avatar';
import { GameTile } from '@/components/identity/GameTile';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import type { DuelGame } from '@/hooks/useDashboard';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { lastMoveAt, netOf, NO_WINNER_REASONS, otherOf, outcomeOf, type MyDuel, type Outcome } from '@/lib/dashboard';
import type { SeatSide } from '@/lib/duel';
import type { OwedItem } from '@/lib/owed';
import { cn, formatDateTime, formatUSDT } from '@/lib/utils';

/** Each result's mark and name: a cup for a win, a flag for a loss, the way back for no winner. */
export const OUTCOME_LOOKS: Record<Outcome, { icon: IconName; label: TranslationKey }> = {
  won: { icon: 'trophy', label: 'dashboard.outcomeWon' },
  lost: { icon: 'flag', label: 'dashboard.outcomeLost' },
  none: { icon: 'undo', label: 'dashboard.outcomeNoWinner' },
};

interface HistoryRowProps {
  entry: MyDuel;
  game: DuelGame | null;
  nameOf: (address: string) => string;
  /** The money the contract still keeps for the reader from this duel. */
  owed: OwedItem | undefined;
  /** The page opening: the result is stamped on and the winner's cup pops, after the row rises. */
  isStamped: boolean;
}

/**
 * A finished duel: the reader and their opponent side by side in the seat colours they had, the
 * winner in the sun ring with the cup and the loser dimmed; the game, number, opponent and note; the
 * result, the loudest part, with what it won or cost; what is still to take, and when. Where the
 * column is narrow the row reads down: the game, then the result and the amount, then the opponent
 * and the rest.
 */
export function HistoryRow({ entry, game, nameOf, owed, isStamped }: HistoryRowProps) {
  const { t, language } = useTranslation();
  const timeAgo = useTimeAgo();
  const { duel } = entry;
  const outcome = outcomeOf(entry);
  const other = otherOf(entry);
  const reasonKey = NO_WINNER_REASONS[entry.phase];
  const reason = reasonKey ? t(reasonKey, { other: other ? nameOf(other) : '' }) : null;
  const net = netOf(entry);
  const at = lastMoveAt(entry);

  return (
    <Link
      href={`/duel/${duel.id}`}
      className={cn(
        'group/row grid grid-cols-[62px_minmax(0,1fr)_auto_84px_18px] items-center gap-4 rounded-[20px] px-3.5 py-3 text-ink no-underline transition-colors duration-200 hover:bg-canvas',
        '@max-[600px]/desk:grid-cols-[52px_minmax(0,1fr)_auto] @max-[600px]/desk:gap-x-3 @max-[600px]/desk:gap-y-1 @max-[600px]/desk:p-3'
      )}
    >
      <Duo entry={entry} outcome={outcome} other={other} isStamped={isStamped} />
      <span className={'grid min-w-0 gap-1 @max-[600px]/desk:contents'}>
        <span className={'flex min-w-0 items-center gap-2 @max-[600px]/desk:col-[2/-1] @max-[600px]/desk:row-start-1'}>
          <GameTile name={game?.name ?? null} category={game?.category} className="size-6 rounded-[7px] text-[0.5625rem]" />
          <b className="truncate font-strong">{game?.name ?? t('duel.title', { id: duel.id })}</b>
          {game && <span className="text-sm/[1.55] font-label text-ink-3 tabular-nums">#{duel.id}</span>}
        </span>
        <span className={'flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm/[1.55] text-ink-3 @max-[600px]/desk:col-[2/-1] @max-[600px]/desk:row-start-3 @max-[600px]/desk:min-w-0'}>
          {other ? (
            <>
              <span>{t('dash.row.vs')}</span>
              <span className="font-label text-ink tabular-nums">{nameOf(other)}</span>
            </>
          ) : (
            <span>{reason}</span>
          )}
        </span>
        {duel.message && <span className={'truncate text-sm/[1.55] text-ink-3 @max-[600px]/desk:col-[2/-1]'}>“{duel.message}”</span>}
      </span>
      <span className={'grid justify-items-end gap-1 text-right @max-[600px]/desk:contents'}>
        <span
          className={cn(
            'inline-flex h-[30px] items-center gap-1.5 rounded-full bg-canvas-deep pr-3 pl-2.5 text-sm font-extrabold whitespace-nowrap text-ink',
            outcome === 'won' && 'bg-sun inset-shadow-[0_-3px_0_var(--color-sun-edge)]',
            outcome === 'lost' && 'bg-ink-2 text-paper',
            outcome === 'none' && 'border-[1.5px] border-dashed border-line-strong bg-transparent text-ink-2',
            '@max-[600px]/desk:col-start-2 @max-[600px]/desk:row-start-2 @max-[600px]/desk:h-7 @max-[600px]/desk:justify-self-start @max-[600px]/desk:pr-[11px] @max-[600px]/desk:pl-[9px]',
            isStamped && 'animate-stamp [animation-delay:calc(var(--i)*45ms+180ms)]'
          )}
        >
          <Icon name={OUTCOME_LOOKS[outcome].icon} className="size-4 stroke-[2.4]" />
          {t(OUTCOME_LOOKS[outcome].label)}
        </span>
        <span
          className={cn(
            'inline-flex items-baseline gap-1 text-xl font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums',
            outcome === 'won' ? 'text-sun-ink' : outcome === 'lost' ? 'text-ink-2' : 'text-ink-3',
            '@max-[600px]/desk:col-start-3 @max-[600px]/desk:row-start-2 @max-[600px]/desk:justify-self-end @max-[600px]/desk:text-lg'
          )}
        >
          {net > 0n ? `+${formatUSDT(net, language)}` : net < 0n ? `−${formatUSDT(-net, language)}` : '±0'}
          <small className="text-xs font-label tracking-normal text-ink-3">USDT</small>
        </span>
        {outcome === 'none' && other && reason && (
          <span className={'text-note/[1.55] text-ink-3 @max-[600px]/desk:col-[2/-1] @max-[600px]/desk:justify-self-start @max-[600px]/desk:text-left @max-[600px]/desk:text-ink-2'}>{reason}</span>
        )}
        {owed && (
          <span
            className={cn(
              'inline-flex items-center gap-[5px] rounded-full bg-canvas-deep px-[9px] py-[3px] text-xs font-strong whitespace-nowrap text-ink',
              owed.kind === 'win' && 'bg-sun-soft text-sun-ink',
              '@max-[600px]/desk:col-[2/-1] @max-[600px]/desk:justify-self-start'
            )}
          >
            <Icon name={owed.kind === 'win' ? 'trophy' : 'undo'} className="size-[13px]" />
            {t('dash.row.waiting', { amount: formatUSDT(owed.raw, language) })}
          </span>
        )}
      </span>
      <time
        dateTime={new Date(Number(at) * 1000).toISOString()}
        title={formatDateTime(at, language)}
        className={'text-right text-note/[1.55] whitespace-nowrap text-ink-3 @max-[600px]/desk:col-[2/-1] @max-[600px]/desk:justify-self-start @max-[600px]/desk:text-left'}
      >
        {timeAgo(at)}
      </time>
      <Icon
        name="chevron-right"
        className={'size-[18px] text-ink-3 transition-[translate,color] duration-200 ease-press group-hover/row:translate-x-0.5 group-hover/row:text-ink @max-[600px]/desk:hidden'}
      />
    </Link>
  );
}

const SEAT_TONES: Record<SeatSide, 'red' | 'blue'> = { creator: 'red', opponent: 'blue' };

/** The two players in their seat colours; the cup and the sun ring sit on whoever won, as on the arena's seats. */
function Duo({ entry, outcome, other, isStamped }: { entry: MyDuel; outcome: Outcome; other: string | null; isStamped: boolean }) {
  const you = entry.seat === 'creator' ? entry.duel.creator : entry.duel.opponent;
  const theirSeat: SeatSide = entry.seat === 'creator' ? 'opponent' : 'creator';

  return (
    <span aria-hidden="true" className={'relative flex items-center @max-[600px]/desk:col-start-1 @max-[600px]/desk:row-span-2 @max-[600px]/desk:row-start-1 @max-[600px]/desk:mt-0.5 @max-[600px]/desk:self-start'}>
      <Face address={you} tone={SEAT_TONES[entry.seat]} isWinner={outcome === 'won'} isDimmed={outcome === 'lost'} isStamped={isStamped} />
      <Face
        address={other}
        tone={SEAT_TONES[theirSeat]}
        isWinner={outcome === 'lost'}
        isDimmed={outcome === 'won'}
        isStamped={isStamped}
        className={'-ml-2.5 @max-[600px]/desk:-ml-2'}
      />
    </span>
  );
}

interface FaceProps {
  /** Null while nobody took the seat: a dashed ring stands in for the face. */
  address: string | null;
  tone: 'red' | 'blue';
  isWinner: boolean;
  isDimmed: boolean;
  isStamped: boolean;
  className?: string;
}

function Face({ address, tone, isWinner, isDimmed, isStamped, className }: FaceProps) {
  return (
    <span className={cn('relative grid size-9 rounded-full transition-opacity duration-200', '@max-[600px]/desk:size-[30px]', isWinner && 'z-1', isDimmed && 'opacity-50', className)}>
      {address ? (
        <Avatar
          address={address}
          tone={tone}
          className={cn('size-full ring-[2.5px] ring-paper', isWinner && 'outline-[2.5px] outline-offset-[2.5px] outline-sun')}
        />
      ) : (
        <span className="size-full rounded-full border-2 border-dashed border-line-strong bg-paper" />
      )}
      {isWinner && (
        <span
          className={cn(
            'absolute -right-1.5 -bottom-[5px] grid size-5 place-items-center rounded-full border-2 border-paper bg-sun text-ink',
            isStamped && 'animate-pop [animation-delay:calc(var(--i)*45ms+320ms)]',
            'group-hover/row:animate-bump group-hover/row:[animation-delay:0ms]'
          )}
        >
          <Icon name="trophy" className="size-[11px] stroke-[2.6]" />
        </span>
      )}
    </span>
  );
}
