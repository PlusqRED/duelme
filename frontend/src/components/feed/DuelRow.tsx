'use client';

import { useId } from 'react';
import { DuelReceipt } from '@/components/feed/DuelReceipt';
import { StatePill } from '@/components/feed/StatePill';
import { Avatar } from '@/components/identity/Avatar';
import { GameTile } from '@/components/identity/GameTile';
import { PlayerLink } from '@/components/identity/PlayerLink';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { useClockValue } from '@/hooks/useNow';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { useTranslation } from '@/i18n/useTranslation';
import { getContractConfig } from '@/lib/contractConfig';
import { feedMoney, type FeedDuel } from '@/lib/duelFeed';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { duelPhase, phaseLabel } from '@/lib/duelPhase';
import { winnerSide } from '@/lib/landingDuels';
import { cn, formatDateTime, formatUSDT } from '@/lib/utils';

interface DuelRowProps {
  duel: FeedDuel;
  isOpen: boolean;
  onToggle: () => void;
  /** A filter was just picked that this duel is not in: the row steps out. */
  isLeaving?: boolean;
  /** The list's place for it: where it rises from as a page of rows arrives. */
  index?: number;
  className?: string;
}

/**
 * A duel someone joined as one row: the game, both players with the winner marked, or the state
 * while there is none, the note, the pot and when it last moved. It opens into the receipt of
 * where the money went, or is. The state changes by itself when a reported win runs out of time.
 * The row presses as one button, spread over it, with the players' names on top leading to their
 * profiles: a link cannot sit inside a button.
 */
export function DuelRow({ duel, isOpen, onToggle, isLeaving = false, index, className }: DuelRowProps) {
  const { t, language } = useTranslation();
  const timeAgo = useTimeAgo();
  const panelId = useId();
  const phase = useClockValue((now) => duelPhase(duel, now, getContractConfig().claimTimeout));
  const money = feedMoney(phase);
  const winner = money === 'won' ? winnerSide(duel) : null;

  return (
    <li
      data-key={duel.id}
      data-leaving={isLeaving ? '' : undefined}
      style={index === undefined ? undefined : { '--i': index }}
      className={cn(
        'not-first:before:mx-4 not-first:before:block not-first:before:h-px not-first:before:bg-line data-leaving:animate-leave',
        className
      )}
    >
      <div
        className={cn(
          'group/head relative grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-3.5 rounded-[20px] p-3.5 text-left transition-colors hover:bg-canvas',
          'max-xs:grid-cols-[auto_minmax(0,1fr)_auto] max-xs:gap-x-3 max-xs:gap-y-2.5 max-xs:p-3',
          isOpen && 'bg-canvas'
        )}
      >
        <GameTile name={duel.game?.gameName ?? null} category={duel.game?.category} />
        <span className="grid min-w-0 gap-1.5">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={onToggle}
              className="inline-flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-1 text-left after:absolute after:inset-0 after:z-1 after:rounded-[20px] focus-visible:outline-hidden focus-visible:after:outline-3 focus-visible:after:outline-offset-3 focus-visible:after:outline-blue"
            >
              <b className="font-strong">{duel.game?.gameName ?? t('publicDuels.noGame')}</b>
              <span className="text-sm font-label text-ink-3">#{duel.id}</span>
            </button>
            {money !== 'won' && <StatePill label={phaseLabel(duel, phase)} className="self-center" />}
          </span>
          {/* "vs" travels with the second player, so a narrow row breaks before it, not after. */}
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm">
            <Player address={duel.player1} name={duel.creatorName} tone="red" isWinner={winner === 'creator'} />
            <span className="inline-flex items-center gap-2.5">
              <span className="text-note font-label text-ink-3">vs</span>
              <Player address={duel.player2} name={duel.opponentName} tone="blue" isWinner={winner === 'opponent'} />
            </span>
          </span>
          {hasVisibleDuelMessage(duel.message) && <span className="text-sm text-ink-3">“{duel.message}”</span>}
        </span>
        <span className="grid justify-items-end text-right max-xs:col-start-2 max-xs:flex max-xs:flex-wrap max-xs:items-baseline max-xs:gap-x-2.5 max-xs:gap-y-1 max-xs:text-left">
          <span className="text-xs text-ink-3 max-xs:hidden">{t('recent.pot')}</span>
          <span className="text-lg font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums">
            {formatUSDT(duel.wagerAmount * 2n, language)}
            <small className="ml-[3px] text-xs font-label tracking-normal text-ink-3">USDT</small>
          </span>
          <span title={formatDateTime(duel.lastEventAt, language)} className="text-note whitespace-nowrap text-ink-3">
            {timeAgo(duel.lastEventAt)}
          </span>
        </span>
        <span
          className={cn(
            'grid size-8 place-items-center self-center rounded-full transition-[rotate,background-color,color] duration-350 ease-spring max-xs:col-start-3 max-xs:row-start-1',
            isOpen ? 'rotate-180 bg-ink text-paper' : 'bg-canvas text-ink-2 group-hover/head:bg-paper group-hover/head:text-ink'
          )}
        >
          <Icon name="chevron" className="size-[18px]" />
        </span>
      </div>
      <div id={panelId}>{isOpen && <DuelReceipt duel={duel} money={money} winner={winner} />}</div>
    </li>
  );
}

interface PlayerProps {
  address: string;
  name: string;
  tone: 'red' | 'blue';
  isWinner: boolean;
}

function Player({ address, name, tone, isWinner }: PlayerProps) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 font-label whitespace-nowrap tabular-nums">
      <PlayerLink address={address} className="relative z-2 inline-flex items-center gap-1.5">
        <Avatar address={address} tone={tone} className="size-[22px] inset-shadow-none" />
        {name}
      </PlayerLink>
      {isWinner && (
        <Chip className="h-[22px] bg-sun pr-2 pl-1.5 text-xs font-strong text-ink">
          <Icon name="trophy" className="size-[13px]" />
          {t('recent.won')}
        </Chip>
      )}
    </span>
  );
}
