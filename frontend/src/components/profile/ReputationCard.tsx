'use client';

import { useId, useRef, type ReactNode } from 'react';
import { LevelBadge } from '@/components/identity/LevelBadge';
import { QuestLine } from '@/components/identity/QuestLine';
import { Tally } from '@/components/identity/Tally';
import { verdictTints } from '@/components/landing/ReputationLab';
import { ReputationGauge } from '@/components/landing/ReputationGauge';
import type { ReputationData } from '@/hooks/useReputation';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import { useTranslation } from '@/i18n/useTranslation';
import { getReputationDescriptionKey, levelQuest } from '@/lib/reputation';
import { gaugePoint } from '@/lib/reputationGauge';
import { cn } from '@/lib/utils';

/** Where the pin waits before it walks to the player's place: the start of the scale. */
const START = { level: 'new', spot: 0 } as const;
/** What lets the pin glide rather than jump; it adds no +1, since nothing was just marked. */
const WALK = { id: 1, mark: 'reset', level: null } as const;

interface ReputationCardProps {
  reputation: ReputationData;
  /** The player's face, standing on the scale. */
  face: ReactNode;
}

/**
 * A player's real record on the landing's reputation scale: duels honored and abandoned, their face
 * walking from the start of the scale to where the record puts them the first time it is seen, the
 * level it earns with what that tells an opponent, and the way to the next level.
 */
export function ReputationCard({ reputation, face }: ReputationCardProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const scaleRef = useRef<HTMLDivElement>(null);
  const isSeen = useSeenOnce(scaleRef, 0.6);
  const { honored, abandoned, level, isLoading, isError } = reputation;
  const isKnown = !isLoading && !isError;

  return (
    <section
      aria-labelledby={titleId}
      className="@container/lab grid content-start gap-5 rounded-[28px] border border-line bg-paper p-[clamp(18px,3vw,28px)]"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id={titleId} className="text-xl">
          {t('rep.title')}
        </h2>
        {isKnown && (
          <p className="ml-auto flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-ink-2">
            <Tally icon="check" ink="text-good-ink" label={t('rep.try.honored')} count={honored} />
            <Tally icon="x" ink="text-orange-ink" label={t('rep.try.abandoned')} count={abandoned} />
          </p>
        )}
      </div>

      {isError ? (
        <p className="rounded-tile bg-canvas px-4 py-3.5 text-ink-2">{t('profile.repError')}</p>
      ) : (
        <div ref={scaleRef} className={cn(!isKnown && 'opacity-40')}>
          <ReputationGauge
            point={isKnown && isSeen ? gaugePoint(honored, abandoned) : START}
            change={isKnown && isSeen ? WALK : null}
            face={face}
          />
        </div>
      )}

      {isKnown && (
        <>
          <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-tile px-4 py-3.5', verdictTints[level])}>
            <LevelBadge level={level} className="h-[38px] gap-2 pr-4 pl-3 text-body" />
            <p className="flex-[1_1_240px]">{t(getReputationDescriptionKey(level))}</p>
          </div>
          <QuestLine
            quest={levelQuest(honored, abandoned)}
            isEntering={isSeen}
            className="border-t border-dashed border-line-strong pt-4"
          />
        </>
      )}
    </section>
  );
}
