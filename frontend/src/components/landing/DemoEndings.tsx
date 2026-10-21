'use client';

import { useId } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { DEMO_OUTCOMES, type DemoOutcome } from '@/lib/demoDuel';
import { cn } from '@/lib/utils';

const ENDINGS: Record<DemoOutcome, { icon: IconName; key: TranslationKey }> = {
  confirm: { icon: 'check', key: 'sim.pick.confirm' },
  dispute: { icon: 'x', key: 'sim.pick.dispute' },
  timeout: { icon: 'clock', key: 'sim.pick.timeout' },
};

interface DemoEndingsProps {
  /** The ending on screen, pressed: navy, like the action it is; none before the last step. */
  picked: DemoOutcome | null;
  /** A play just ended: the other endings nudge, to say there is more than one. */
  isInviting: boolean;
  onPick: (outcome: DemoOutcome) => void;
}

/** The three things the opponent can do once you report a win, each one showing how the duel ends. */
export function DemoEndings({ picked, isInviting, onPick }: DemoEndingsProps) {
  const { t } = useTranslation();
  const askId = useId();

  return (
    <div role="group" aria-labelledby={askId} className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[18px] bg-canvas p-3">
      <p id={askId} className="mb-1 flex-[1_1_100%] pl-1 text-body-sm font-bold">
        {t('sim.ask')}
      </p>
      {DEMO_OUTCOMES.map((outcome) => (
        <button
          key={outcome}
          type="button"
          aria-pressed={picked === outcome}
          onClick={() => onPick(outcome)}
          className={cn(
            buttonVariants({ variant: picked === outcome ? 'navy' : 'paper', size: 'sm' }),
            'flex-[1_1_0] px-3.5',
            isInviting && picked !== outcome && 'animate-nudge'
          )}
        >
          <Icon name={ENDINGS[outcome].icon} className="size-[18px]" />
          {t(ENDINGS[outcome].key)}
        </button>
      ))}
    </div>
  );
}
