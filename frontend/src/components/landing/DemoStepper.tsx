'use client';

import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { DEMO_STEPS } from '@/lib/demoDuel';
import { cn } from '@/lib/utils';

const STEP_LABELS: Record<(typeof DEMO_STEPS)[number], TranslationKey> = {
  1: 'sim.step.1',
  2: 'sim.step.2',
  3: 'sim.step.3',
  4: 'sim.step.4',
  5: 'sim.step.5',
};

interface DemoStepperProps {
  step: number;
  /** The step whose bar fills while the play waits on it, over the demo's `--dwell`. */
  timing: number | null;
  onPick: (step: number) => void;
}

/**
 * The demo's five steps, each one a button that shows it: a number and a name, a bar under each
 * step done. They follow the width of the demo: names alone in a narrow column, numbers alone on a
 * phone, with the name still read out.
 */
export function DemoStepper({ step, timing, onPick }: DemoStepperProps) {
  const { t } = useTranslation();

  return (
    <ol aria-label={t('sim.stepsLabel')} className="mt-3.5 grid grid-cols-5 gap-1">
      {DEMO_STEPS.map((n) => (
        <li key={n}>
          <button
            type="button"
            aria-current={n === step ? 'step' : undefined}
            data-reached={n <= step ? '' : undefined}
            onClick={() => onPick(n)}
            className="group relative flex min-h-12 w-full cursor-pointer items-center gap-[5px] overflow-hidden rounded-xl px-1 pb-1.5 text-left text-note font-label text-ink-3 transition-colors hover:bg-canvas data-reached:text-ink @max-[440px]/sim:justify-center @max-[440px]/sim:px-0"
          >
            <b className="grid size-5 shrink-0 place-items-center rounded-full bg-canvas-deep text-xs font-extrabold text-ink-2 transition-colors group-data-reached:bg-ink group-data-reached:text-paper @max-[560px]/sim:hidden @max-[440px]/sim:grid">
              {n}
            </b>
            <span className="truncate @max-[440px]/sim:sr-only">{t(STEP_LABELS[n])}</span>
            <i aria-hidden="true" className="absolute inset-x-1.5 bottom-[5px] h-[3px] overflow-hidden rounded-[3px] bg-line">
              <i
                className={cn(
                  'absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-350 group-data-reached:scale-x-100',
                  n === timing && 'animate-fill transition-none group-data-reached:scale-x-0'
                )}
              />
            </i>
          </button>
        </li>
      ))}
    </ol>
  );
}
