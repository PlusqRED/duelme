'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/identity/Avatar';
import { LevelBadge } from '@/components/identity/LevelBadge';
import { QuestLine } from '@/components/identity/QuestLine';
import { Tally } from '@/components/identity/Tally';
import { ReputationGauge } from '@/components/landing/ReputationGauge';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import type { Translator } from '@/i18n/translate';
import { useTranslation } from '@/i18n/useTranslation';
import { getReputationLabelKey, levelQuest, type LevelQuest } from '@/lib/reputation';
import { gaugePoint } from '@/lib/reputationGauge';
import { cn } from '@/lib/utils';

/** The badge and the quest come in once the pin has walked onto the scale. */
const LEVEL_AFTER_MS = 520;

interface StandingReputationProps {
  /** Checksummed, for the face on the scale. */
  address: string;
  honored: number;
  abandoned: number;
}

/**
 * The reader's reputation: their level's badge, where their record puts them on the landing's
 * scale, the two tallies, the quest to the next level and, in words, how far it is. The first time
 * it is seen, the pin walks onto the scale from its start, then the badge jumps and the quest's
 * cells light.
 */
export function StandingReputation({ address, honored, abandoned }: StandingReputationProps) {
  const { t, plural } = useTranslation();
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isSeen = useSeenOnce(ref, 0.3);
  const [isLevelIn, setIsLevelIn] = useState(false);
  const quest = levelQuest(honored, abandoned);
  const isWaiting = !reducedMotion && !isLevelIn;

  useEffect(() => {
    if (!isSeen || isLevelIn) return;
    const timer = setTimeout(() => setIsLevelIn(true), LEVEL_AFTER_MS);
    return () => clearTimeout(timer);
  }, [isSeen, isLevelIn]);

  return (
    <div ref={ref} className="grid gap-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-strong">{t('rep.title')}</h3>
        <LevelBadge
          level={quest.level}
          className={cn('h-8 pr-3 pl-[9px] text-body-sm [&_svg]:size-[18px]', isWaiting && 'opacity-0', !reducedMotion && isLevelIn && 'animate-level-up')}
        />
      </div>
      <ReputationGauge
        point={gaugePoint(honored, abandoned)}
        change={null}
        face={<Avatar address={address} tone="ink" className="size-full" />}
        entrance={reducedMotion ? undefined : isSeen ? 'walking' : 'waiting'}
        isCompact
      />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-ink-2">
        <Tally icon="check" ink="text-good-ink" label={t('rep.try.honored')} count={honored} />
        <Tally icon="x" ink="text-orange-ink" label={t('rep.try.abandoned')} count={abandoned} />
      </p>
      {/* At the top, the words below say all there is: there is no way left to draw. */}
      {quest.next && <QuestLine quest={quest} isStacked isWaiting={isWaiting} isEntering={!reducedMotion && isLevelIn} />}
      <p className="rounded-[14px] bg-canvas px-3 py-2.5 text-body-sm/[1.45] text-ink">{nextLevelText(quest, abandoned, { t, plural })}</p>
    </div>
  );
}

/** How far the next level is, in words: the duels the quest still misses. */
function nextLevelText(quest: LevelQuest, abandoned: number, { t, plural }: Translator): string {
  if (quest.level === 'new') return t('dash.rep.next.new');
  if (!quest.next) return t('quest.summit');
  const n = quest.need - quest.have;
  return t(abandoned === 0 ? 'dash.rep.next.clean' : 'dash.rep.next.up', {
    n,
    duels: plural('dash.duels', n),
    level: t(getReputationLabelKey(quest.next)),
  });
}
