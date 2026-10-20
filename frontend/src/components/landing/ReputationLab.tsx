'use client';

import { useId } from 'react';
import { Avatar } from '@/components/identity/Avatar';
import { LevelBadge } from '@/components/identity/LevelBadge';
import { ReputationGauge } from '@/components/landing/ReputationGauge';
import { SectionHead } from '@/components/landing/SectionHead';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { useReputationSample, type SampleChange } from '@/hooks/useReputationSample';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { getReputationDescriptionKey, type ReputationLevel, type ReputationMark } from '@/lib/reputation';
import { cn } from '@/lib/utils';

/** The made-up player the scale is tried on: a face, never a real address. */
const SAMPLE_PLAYER = '0x5a3e00000000000000000000000000000000d1e0';

interface MarkLook {
  icon: IconName;
  /** The colour of its icon in the tally. */
  ink: string;
  /** Its name in the tally, and on the button that adds one, with what that does. */
  tally: TranslationKey;
  label: TranslationKey;
  desc: TranslationKey;
  button: string;
}

const markLooks: Record<ReputationMark, MarkLook> = {
  honored: {
    icon: 'check',
    ink: 'text-good-ink',
    tally: 'rep.try.honored',
    label: 'rep.honoredTag',
    desc: 'rep.howHonored',
    button: 'bg-good-ink text-paper [--keycap-edge:var(--color-good-edge)]',
  },
  abandoned: {
    icon: 'x',
    ink: 'text-orange-ink',
    tally: 'rep.try.abandoned',
    label: 'rep.abandonedTag',
    desc: 'rep.howAbandoned',
    button: 'bg-paper text-orange-ink [--keycap-edge:var(--color-orange-edge)] [--keycap-ring:var(--color-orange-edge)]',
  },
};

const markOrder: readonly ReputationMark[] = ['honored', 'abandoned'];

/** A verdict's ground, in the soft shade of its level. */
export const verdictTints: Record<ReputationLevel, string> = {
  new: 'bg-level-new-soft',
  unreliable: 'bg-orange-soft',
  fair: 'bg-sun-soft',
  honorable: 'bg-good-soft',
};

/**
 * How reputation works, to try by hand: a sample player whose duels you mark honored or abandoned,
 * walking along the scale as the score moves them, with the level they reach and what it tells an
 * opponent.
 */
export function ReputationLab() {
  const { t } = useTranslation();
  const titleId = useId();
  const labTitleId = useId();
  const sample = useReputationSample();
  const { level } = sample.point;
  const face = <Avatar address={SAMPLE_PLAYER} tone="red" className="size-full" />;

  return (
    <section id="player-trust" aria-labelledby={titleId} className="mx-auto w-full max-w-page px-gutter pt-section">
      <SectionHead titleId={titleId} title={t('rep.howTitle')} subtitle={t('rep.howDesc')} />
      <div
        role="group"
        aria-labelledby={labTitleId}
        className="@container/lab grid grid-cols-[minmax(0,1fr)] gap-[22px] rounded-[28px] border border-line bg-paper p-[clamp(18px,3vw,32px)]"
      >
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
          <span className="block size-11 flex-none">{face}</span>
          <div className="min-w-0 flex-[1_1_12rem]">
            <p id={labTitleId} className="font-strong">
              {t('rep.try.title')}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-ink-2">
              {markOrder.map((mark) => (
                <Tally key={mark} mark={mark} count={sample[mark]} change={sample.change} />
              ))}
            </p>
          </div>
          <button type="button" onClick={sample.reset} className="link ml-auto inline-flex min-h-11 cursor-pointer items-center">
            {t('rep.try.reset')}
          </button>
        </div>

        <ReputationGauge point={sample.point} change={sample.change} face={face} />

        <div
          aria-live="polite"
          className={cn('flex min-h-[72px] flex-wrap items-center gap-x-4 gap-y-2.5 rounded-tile px-4 py-3.5', verdictTints[level])}
        >
          <LevelBadge
            key={level}
            level={level}
            className={cn(
              'h-[38px] gap-2 pr-4 pl-3 text-body',
              sample.change?.level === 'up' && 'animate-level-up',
              sample.change?.level === 'down' && 'animate-shake'
            )}
          />
          <p className="flex-[1_1_280px]">{t(getReputationDescriptionKey(level))}</p>
        </div>

        <div className="grid gap-4 @min-[640px]/lab:grid-cols-2 @min-[640px]/lab:gap-6">
          {markOrder.map((mark) => (
            <div key={mark} className="grid content-start justify-items-start gap-2">
              <Button onClick={() => sample.add(mark)} className={markLooks[mark].button}>
                <Icon name={markLooks[mark].icon} className="size-[18px] stroke-[2.8]" />
                {t(markLooks[mark].label)}
              </Button>
              <p className="text-body-sm text-ink-2">{t(markLooks[mark].desc)}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 max-w-[70ch] text-body-sm text-ink-3">{t('rep.howFormula')}</p>
    </section>
  );
}

interface TallyProps {
  mark: ReputationMark;
  count: number;
  change: SampleChange | null;
}

/** One side of the sample's record; it bumps when it was the one just added to. */
function Tally({ mark, count, change }: TallyProps) {
  const { t } = useTranslation();
  const isChanged = change?.mark === mark;
  const look = markLooks[mark];

  return (
    <span className="inline-flex items-center gap-[5px]">
      <Icon name={look.icon} className={cn('size-[15px] stroke-[2.8]', look.ink)} />
      {t(look.tally)}{' '}
      <b key={isChanged ? change.id : 'still'} className={cn('inline-block font-extrabold text-ink tabular-nums', isChanged && 'animate-bump')}>
        {count}
      </b>
    </span>
  );
}
