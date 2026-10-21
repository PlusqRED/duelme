'use client';

import { Icon } from '@/components/ui/icon';
import type { TurnMoves } from '@/components/duel/room/TurnActions';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

const picks = [
  { move: 'won', icon: 'trophy', label: 'room.action.won', hint: 'room.action.won.hint', tone: 'text-sun-edge', hover: 'hover:bg-sun-soft' },
  { move: 'lost', icon: 'flag', label: 'room.action.lost', hint: 'room.action.lost.hint', tone: 'text-ink-3', hover: '' },
] as const;

/**
 * I won and I lost: two big keys side by side, each saying what it sets off — the other player's
 * time to confirm, or the pot going to them at once.
 */
export function TurnPicks({ vars, onMove, isBusy }: Pick<TurnMoves, 'vars' | 'onMove' | 'isBusy'>) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-3">
      {picks.map((pick) => (
        <button
          key={pick.move}
          type="button"
          data-action={pick.move}
          disabled={isBusy}
          onClick={() => onMove(pick.move)}
          className={cn(
            'mb-1 grid min-h-[112px] cursor-pointer content-start justify-items-center gap-1 rounded-[20px] border-[1.5px] border-line-strong bg-paper px-3 pt-4 pb-3.5 text-center shadow-[0_4px_0_var(--color-line-strong)] transition-[translate,box-shadow,border-color,background-color] duration-140 ease-press',
            'hover:-translate-y-px hover:border-ink hover:shadow-[0_5px_0_var(--color-ink)] active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-ink)] active:duration-50',
            'disabled:cursor-default disabled:opacity-50',
            pick.hover
          )}
        >
          <Icon name={pick.icon} className={cn('mb-0.5 size-[30px]', pick.tone)} />
          <strong className="text-[1.1875rem] font-extrabold tracking-[-0.01em]">{t(pick.label)}</strong>
          <small className="text-note/[1.35] text-ink-3">{t(pick.hint, vars)}</small>
        </button>
      ))}
    </div>
  );
}
