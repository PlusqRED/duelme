'use client';

import { PHASE_TONES } from '@/components/duel/phaseTones';
import { useTranslation } from '@/i18n/useTranslation';
import type { PhaseLabel } from '@/lib/duelPhase';
import { cn } from '@/lib/utils';

interface StatePillProps {
  label: PhaseLabel;
  className?: string;
}

/** A duel's state in a list, small: a dot in the colour of what it waits on, pulsing while a player has to act. */
export function StatePill({ label, className }: StatePillProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-note font-strong whitespace-nowrap',
        PHASE_TONES[label.tone],
        // Small type on the orange wash needs the darker orange to read.
        label.tone === 'late' && 'text-orange-ink',
        className
      )}
    >
      <i
        aria-hidden="true"
        className={cn(
          'relative size-[7px] shrink-0 rounded-full bg-(--tone)',
          label.isLive && 'after:absolute after:inset-0 after:animate-on-air after:rounded-full after:bg-(--tone)'
        )}
      />
      {t(label.key)}
    </span>
  );
}
