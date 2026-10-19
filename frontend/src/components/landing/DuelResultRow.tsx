'use client';

import { useId } from 'react';
import { Avatar } from '@/components/identity/Avatar';
import { GameTile } from '@/components/identity/GameTile';
import { PayoutReceipt } from '@/components/landing/PayoutReceipt';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import type { WonDuel } from '@/hooks/useWonDuels';
import { useTranslation } from '@/i18n/useTranslation';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { cn, formatUSDT } from '@/lib/utils';

interface DuelResultRowProps {
  duel: WonDuel;
  isOpen: boolean;
  onToggle: () => void;
  /** A game was just picked that this duel was not played in: the row steps out. */
  isLeaving: boolean;
}

/**
 * A finished duel as one row: the game, both players with the winner marked, the note, the pot and
 * when it ended. It opens into the receipt of where the money went.
 */
export function DuelResultRow({ duel, isOpen, onToggle, isLeaving }: DuelResultRowProps) {
  const { t, language } = useTranslation();
  const timeAgo = useTimeAgo();
  const panelId = useId();

  return (
    <li
      data-key={duel.id}
      data-leaving={isLeaving ? '' : undefined}
      className="not-first:before:mx-4 not-first:before:block not-first:before:h-px not-first:before:bg-line data-leaving:animate-leave"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          'group/head grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-3.5 rounded-[20px] p-3.5 text-left transition-colors hover:bg-canvas',
          'max-xs:grid-cols-[auto_minmax(0,1fr)_auto] max-xs:gap-x-3 max-xs:gap-y-2.5 max-xs:p-3',
          isOpen && 'bg-canvas'
        )}
      >
        <GameTile name={duel.game?.gameName ?? null} category={duel.game?.category} />
        <span className="grid min-w-0 gap-1.5">
          <span className="flex items-baseline gap-2">
            <b className="font-strong">{duel.game?.gameName ?? t('publicDuels.noGame')}</b>
            <span className="text-sm font-label text-ink-3">#{duel.id}</span>
          </span>
          {/* "vs" travels with the second player, so a narrow row breaks before it, not after. */}
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm">
            <Player address={duel.creator} name={duel.creatorName} tone="red" isWinner={duel.winner === 'creator'} />
            <span className="inline-flex items-center gap-2.5">
              <span className="text-note font-label text-ink-3">vs</span>
              <Player address={duel.opponent} name={duel.opponentName} tone="blue" isWinner={duel.winner === 'opponent'} />
            </span>
          </span>
          {hasVisibleDuelMessage(duel.note) && <span className="text-sm text-ink-3">“{duel.note}”</span>}
        </span>
        <span className="grid justify-items-end text-right max-xs:col-start-2 max-xs:flex max-xs:flex-wrap max-xs:items-baseline max-xs:gap-x-2.5 max-xs:gap-y-1 max-xs:text-left">
          <span className="text-xs text-ink-3 max-xs:hidden">{t('recent.pot')}</span>
          <span className="text-lg font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums">
            {formatUSDT(duel.stake * 2n, language)}
            <small className="ml-[3px] text-xs font-label tracking-normal text-ink-3">USDT</small>
          </span>
          <span className="text-note whitespace-nowrap text-ink-3">{timeAgo(duel.endedAt)}</span>
        </span>
        <span
          className={cn(
            'grid size-8 place-items-center self-center rounded-full transition-[rotate,background-color,color] duration-350 ease-spring max-xs:col-start-3 max-xs:row-start-1',
            isOpen ? 'rotate-180 bg-ink text-paper' : 'bg-canvas text-ink-2 group-hover/head:bg-paper group-hover/head:text-ink'
          )}
        >
          <Icon name="chevron" className="size-[18px]" />
        </span>
      </button>
      <div id={panelId}>{isOpen && <PayoutReceipt duel={duel} />}</div>
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
      <span className="inline-flex items-center gap-1.5">
        <Avatar address={address} tone={tone} className="size-[22px] inset-shadow-none" />
        {name}
      </span>
      {isWinner && (
        <Chip className="h-[22px] bg-sun pr-2 pl-1.5 text-xs font-strong text-ink">
          <Icon name="trophy" className="size-[13px]" />
          {t('recent.won')}
        </Chip>
      )}
    </span>
  );
}
