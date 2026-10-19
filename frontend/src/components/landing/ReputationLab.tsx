'use client';

import { useId } from 'react';
import { Avatar } from '@/components/identity/Avatar';
import { LevelBadge } from '@/components/identity/LevelBadge';
import { ReputationGauge } from '@/components/landing/ReputationGauge';
import { SectionHead } from '@/components/landing/SectionHead';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useReputationSample, type SampleChange } from '@/hooks/useReputationSample';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { getReputationDescriptionKey, type ReputationLevel, type ReputationMark } from '@/lib/reputation';
import { cn } from '@/lib/utils';

/** The made-up player the scale is tried on: a face, never a real address. */
const SAMPLE_PLAYER = '0x5a3e00000000000000000000000000000000d1e0';

const marks: readonly { mark: ReputationMark; label: TranslationKey; desc: TranslationKey; look: string }[] = [
  {
    mark: 'honored',
    label: 'rep.honoredTag',
    desc: 'rep.howHonored',
    look: 'bg-good-ink text-paper [--keycap-edge:var(--color-good-edge)]',
  },
  {
    mark: 'abandoned',
    label: 'rep.abandonedTag',
    desc: 'rep.howAbandoned',
    look: 'bg-paper text-orange-ink [--keycap-edge:var(--color-orange-edge)] [--keycap-ring:var(--color-orange-edge)]',
  },
];

const verdictTints: Record<ReputationLevel, string> = {
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
              <Tally mark="honored" count={sample.honored} change={sample.change} />
              <Tally mark="abandoned" count={sample.abandoned} change={sample.change} />
            </p>
          </div>
          <button type="button" onClick={sample.reset} className="link ml-auto inline-flex min-h-11 cursor-pointer items-center">
            {t('rep.try.reset')}
          </button>
        </div>

        <ReputationGauge point={sample.point} change={sample.change} face={face} />

        <div
          aria-live="polite"
          className={cn('flex min-h-[72px] flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[18px] px-4 py-3.5', verdictTints[level])}
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
          {marks.map(({ mark, label, desc, look }) => (
            <div key={mark} className="grid content-start justify-items-start gap-2">
              <Button onClick={() => sample.add(mark)} className={look}>
                <Icon name={mark === 'honored' ? 'check' : 'x'} className="size-[18px] stroke-[2.8]" />
                {t(label)}
              </Button>
              <p className="text-body-sm text-ink-2">{t(desc)}</p>
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

  return (
    <span className="inline-flex items-center gap-[5px]">
      <Icon
        name={mark === 'honored' ? 'check' : 'x'}
        className={cn('size-[15px] stroke-[2.8]', mark === 'honored' ? 'text-good-ink' : 'text-orange-ink')}
      />
      {t(mark === 'honored' ? 'rep.try.honored' : 'rep.try.abandoned')}{' '}
      <b key={isChanged ? change.id : 'still'} className={cn('inline-block font-extrabold text-ink tabular-nums', isChanged && 'animate-bump')}>
        {count}
      </b>
    </span>
  );
}
