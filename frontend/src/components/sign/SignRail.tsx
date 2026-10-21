'use client';

import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import type { RailStatus, RailStep } from '@/lib/signingSteps';
import { cn } from '@/lib/utils';

const LABELS: Record<RailStep, TranslationKey> = {
  check: 'sign.step.check',
  network: 'sign.step.network',
  approve: 'sign.step.approve',
  sign: 'sign.step.sign',
  confirm: 'sign.step.confirm',
  send: 'sign.step.send',
  done: 'sign.step.done',
};

const BARS: Record<RailStatus, string> = {
  done: 'scale-x-100 bg-ink',
  // The step under way: a light runs along its bar.
  current: 'w-2/5 animate-scan bg-ink',
  error: 'scale-x-100 bg-orange',
  next: 'scale-x-0 bg-ink',
};

interface SignRailProps {
  steps: { step: RailStep; status: RailStatus }[];
}

/** The steps through the window, each with a bar: filled behind, running where it is, orange where it stopped. */
export function SignRail({ steps }: SignRailProps) {
  const { t } = useTranslation();

  return (
    <ol className="grid auto-cols-[minmax(0,1fr)] grid-flow-col gap-1.5">
      {steps.map(({ step, status }) => (
        <li
          key={step}
          data-status={status}
          aria-current={status === 'current' ? 'step' : undefined}
          className={cn(
            'grid min-w-0 gap-1.5 text-note font-label',
            status === 'error' ? 'text-orange-ink' : status === 'next' ? 'text-ink-3' : 'text-ink'
          )}
        >
          {/* A label may run into the gap before it is cut: «Разрешение» is a pixel wider than its column on a phone. */}
          <span className="-me-1 truncate">{t(LABELS[step])}</span>
          <i aria-hidden="true" className="relative h-1 overflow-hidden rounded-[4px] bg-line">
            <span
              className={cn(
                'absolute inset-y-0 left-0 w-full origin-left rounded-[inherit] transition-transform duration-400',
                BARS[status]
              )}
            />
          </i>
        </li>
      ))}
    </ol>
  );
}
