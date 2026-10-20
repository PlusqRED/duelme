'use client';

import { useState } from 'react';
import { GameTile } from '@/components/identity/GameTile';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { useTranslation } from '@/i18n/useTranslation';
import type { PhaseLabel } from '@/lib/duelPhase';
import { getCategoryLabelKey, type GameCategory } from '@/lib/game';
import { cn, formatDateTime } from '@/lib/utils';

interface DuelHeadProps {
  duelId: number;
  /** The heading's id, which names the arena. */
  titleId: string;
  /** The game the creator named, from the backend; null for a duel created without one. */
  game: { name: string; category: GameCategory | null } | null;
  isPublic: boolean;
  createdAt: bigint;
  label: PhaseLabel;
}

const pillTones: Record<PhaseLabel['tone'], string> = {
  waiting: '[--tone:var(--color-blue)] bg-blue-soft',
  live: '[--tone:var(--color-ink)] bg-canvas-deep',
  paused: '[--tone:var(--color-ink-3)] bg-canvas',
  confirm: '[--tone:var(--color-sun-edge)] bg-sun-soft',
  late: '[--tone:var(--color-orange)] bg-orange-soft',
  paid: '[--tone:var(--color-sun-edge)] bg-sun-soft',
  back: '[--tone:var(--color-ink-3)] bg-canvas',
};

/**
 * The arena's head: the game's tile and name, the duel's number, who may join, the game's category
 * and when it was made, and the duel's state in the colour of what it waits on. The state pulses
 * while a player has to act, and pops when it changes while the page is open.
 */
export function DuelHead({ duelId, titleId, game, isPublic, createdAt, label }: DuelHeadProps) {
  const { t, language } = useTranslation();
  const timeAgo = useTimeAgo();
  const [firstKey] = useState(label.key);
  const title = t('duel.title', { id: duelId });

  return (
    <header className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
      <GameTile name={game?.name ?? null} category={game?.category} />
      <div className="min-w-0 flex-auto">
        <h1 id={titleId} className="text-[clamp(1.5rem,1.15rem+1.1vw,2rem)] tracking-[-0.03em] [overflow-wrap:anywhere]">
          {game?.name ?? title}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-body-sm text-ink-3">
          {game && <b className="font-bold text-ink-2 tabular-nums">{title}</b>}
          <Chip>
            <Icon name={isPublic ? 'globe' : 'lock'} className="size-3.5" />
            {t(isPublic ? 'duel.public' : 'duel.private')}
          </Chip>
          {game?.category && <Chip>{t(getCategoryLabelKey(game.category))}</Chip>}
          <span title={formatDateTime(createdAt, language)}>{t('room.created', { when: timeAgo(createdAt) })}</span>
        </p>
      </div>
      {/* The region stays while the pill in it is drawn anew for each state, so the change is read out. */}
      <div aria-live="polite">
        <p
          key={label.key}
          className={cn(
            'inline-flex min-h-[34px] items-center gap-[9px] rounded-full py-1 pr-3.5 pl-3 text-body-sm/[1.2] font-strong',
            pillTones[label.tone],
            label.key !== firstKey && 'animate-pop'
          )}
        >
          <i
            aria-hidden="true"
            className={cn(
              'relative size-[9px] shrink-0 rounded-full bg-(--tone)',
              label.isLive && 'after:absolute after:inset-0 after:animate-on-air after:rounded-full after:bg-(--tone)'
            )}
          />
          <span>{t(label.key)}</span>
        </p>
      </div>
    </header>
  );
}
