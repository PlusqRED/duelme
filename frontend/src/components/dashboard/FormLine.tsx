'use client';

import { useRef } from 'react';
import { OUTCOME_LOOKS } from '@/components/dashboard/HistoryRow';
import { Icon } from '@/components/ui/icon';
import type { DuelGame } from '@/hooks/useDashboard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import { useTranslation } from '@/i18n/useTranslation';
import { outcomeOf, type MyDuel } from '@/lib/dashboard';
import { FORM_SIZE } from '@/lib/dashboardHistory';
import { cn } from '@/lib/utils';

interface FormLineProps {
  /** The finished duels, newest first. */
  past: readonly MyDuel[];
  gameOf: (duelId: number) => DuelGame | null;
}

/**
 * The latest results at a glance, newest first, like a team's form: a sun cup for a win, a flag
 * for a loss, the way back for no winner. The chips pop in turn the first time the line is seen.
 */
export function FormLine({ past, gameOf }: FormLineProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLParagraphElement>(null);
  const isSeen = useSeenOnce(ref, 0.5);
  const reducedMotion = useReducedMotion();
  const latest = past.slice(0, FORM_SIZE);
  const label = (entry: MyDuel) => t(OUTCOME_LOOKS[outcomeOf(entry)].label);

  return (
    <p
      ref={ref}
      role="img"
      aria-label={t('dash.form.aria', { list: latest.map(label).join(', ') })}
      className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5"
    >
      <span className="text-note font-label text-ink-3">{t('dash.form.label')}</span>
      <span aria-hidden="true" className="flex flex-wrap gap-1 @max-[600px]/desk:gap-[3px]">
        {latest.map((entry, index) => {
          const outcome = outcomeOf(entry);
          const game = gameOf(entry.duel.id);
          return (
            <span
              key={entry.duel.id}
              title={`#${entry.duel.id}${game ? ` ${game.name}` : ''}: ${label(entry)}`}
              style={{ '--i': index }}
              className={cn(
                'grid size-7 place-items-center rounded-[9px] bg-canvas-deep text-ink-2 @max-[600px]/desk:size-6 @max-[600px]/desk:rounded-lg',
                outcome === 'won' && 'bg-sun text-ink inset-shadow-[0_-3px_0_var(--color-sun-edge)]',
                outcome === 'none' && 'border-[1.5px] border-dashed border-line-strong bg-transparent text-ink-3',
                !reducedMotion && (isSeen ? 'animate-pop [animation-delay:calc(var(--i)*60ms)]' : 'opacity-0')
              )}
            >
              <Icon name={OUTCOME_LOOKS[outcome].icon} className="size-[15px] stroke-[2.4] @max-[600px]/desk:size-[13px]" />
            </span>
          );
        })}
      </span>
    </p>
  );
}
