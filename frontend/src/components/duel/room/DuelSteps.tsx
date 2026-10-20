'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import type { DuelStep } from '@/lib/duelPhase';
import { cn } from '@/lib/utils';

interface DuelStepsProps {
  steps: DuelStep[];
  /** How much of the time to answer a reported win has run out, from 0 to 1: the timed step's bar fills with it. */
  timeUsed: number;
}

const STRIPES = 'bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_5px,transparent_5px_9px)]';
const PAUSED_STRIPES = 'bg-[repeating-linear-gradient(90deg,var(--color-ink-3)_0_6px,transparent_6px_10px)]';

const endBadges: Record<NonNullable<DuelStep['tone']>, string> = {
  paid: 'bg-sun text-ink',
  back: 'bg-ink-3 text-paper',
  late: 'bg-orange text-paper',
};

const endBars: Record<NonNullable<DuelStep['tone']>, string> = {
  paid: 'bg-sun',
  back: 'bg-ink-3',
  late: 'bg-orange',
};

function badgeClass(step: DuelStep): string {
  if (step.kind === 'end') return endBadges[step.tone ?? 'back'];
  if (step.kind === 'skipped') return 'bg-transparent text-ink-3 opacity-60 ring-[1.5px] ring-line-strong ring-inset';
  if (step.kind === 'current' && step.mode === 'timed') return 'bg-sun text-ink';
  if (step.kind === 'todo') return 'bg-canvas-deep text-ink-2';
  return 'bg-ink text-paper';
}

function barClass(step: DuelStep): string {
  if (step.kind === 'end') return cn('scale-x-100', endBars[step.tone ?? 'back']);
  if (step.kind === 'done') return 'scale-x-100 bg-ink';
  if (step.kind !== 'current') return 'scale-x-0';
  // Waiting on a person with no deadline: a light runs along the bar.
  if (step.mode === 'waiting') return 'w-[36%] animate-scan bg-ink';
  if (step.mode === 'paused') return cn('scale-x-100', PAUSED_STRIPES);
  // Against the clock the bar fills with the time used; a step being set up has nothing to show yet.
  return step.mode === 'timed' ? 'bg-sun-edge' : 'scale-x-0';
}

/**
 * The landing demo's five steps for this duel: those done, the one it is on, those it never reached
 * struck through, and the last named after how it ended. A step that changes pops its number. They
 * follow the arena's width: names alone in a narrow column, numbers alone on a phone, with the name
 * still read out.
 */
export function DuelSteps({ steps, timeUsed }: DuelStepsProps) {
  const { t } = useTranslation();
  // A step pops when it moves on while the page is open, not as the page opens.
  const [firstKinds] = useState(() => steps.map((step) => step.kind));

  return (
    <ol aria-label={t('room.stepsLabel')} className="mt-[18px] grid grid-cols-5 gap-1 border-t border-line pt-3">
      {steps.map((step, index) => (
        <li
          key={index}
          aria-current={step.kind === 'current' ? 'step' : undefined}
          className={cn(
            'relative flex min-h-[42px] min-w-0 items-center gap-1.5 px-1 pb-[9px] text-note font-label @max-[420px]/arena:justify-center @max-[420px]/arena:px-0',
            step.kind === 'todo' || step.kind === 'skipped' ? 'text-ink-3' : 'text-ink'
          )}
        >
          <b
            key={step.kind}
            className={cn(
              'grid size-[22px] shrink-0 place-items-center rounded-full text-xs font-extrabold transition-colors duration-300 @max-[560px]/arena:hidden @max-[420px]/arena:grid',
              badgeClass(step),
              firstKinds[index] !== step.kind && 'animate-pop'
            )}
          >
            {index + 1}
          </b>
          <span
            className={cn(
              'truncate @max-[420px]/arena:sr-only',
              step.kind === 'skipped' && 'line-through decoration-line-strong decoration-[1.5px]'
            )}
          >
            {t(step.label)}
          </span>
          <i
            aria-hidden="true"
            className={cn(
              'absolute inset-x-1 bottom-0.5 h-1 overflow-hidden rounded-sm bg-line',
              step.kind === 'skipped' && cn(STRIPES, 'opacity-60')
            )}
          >
            <i
              className={cn('absolute inset-y-0 left-0 w-full origin-left rounded-[inherit] transition-transform duration-600', barClass(step))}
              style={step.kind === 'current' && step.mode === 'timed' ? { scale: `${timeUsed} 1` } : undefined}
            />
          </i>
        </li>
      ))}
    </ol>
  );
}
