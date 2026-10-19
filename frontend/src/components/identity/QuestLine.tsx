import { LevelBadge } from '@/components/identity/LevelBadge';
import { useTranslation } from '@/i18n/useTranslation';
import { getReputationLabelKey, questCells, type LevelQuest, type ReputationLevel } from '@/lib/reputation';
import { cn } from '@/lib/utils';

const lit: Record<ReputationLevel, string> = {
  new: 'bg-level-new',
  unreliable: 'bg-orange',
  fair: 'bg-sun',
  honorable: 'bg-good',
};

const nextRing: Record<ReputationLevel, string> = {
  new: 'ring-level-new',
  unreliable: 'ring-orange',
  fair: 'ring-sun',
  honorable: 'ring-good',
};

const nextGlow: Record<ReputationLevel, string> = {
  new: 'bg-level-new-soft',
  unreliable: 'bg-orange-soft',
  fair: 'bg-sun-soft',
  honorable: 'bg-good-soft',
};

interface QuestLineProps {
  quest: LevelQuest;
  /** Light the cells one by one, the first time the quest is shown. */
  isEntering?: boolean;
  className?: string;
}

/**
 * The way to the next level as a quest: a cell per honored duel it needs, the ones done lit in the
 * next level's colour, the next one breathing, and the next level's badge still locked.
 */
export function QuestLine({ quest, isEntering = false, className }: QuestLineProps) {
  const { t } = useTranslation();
  const zone = quest.next ?? quest.level;
  const cells = questCells(quest);
  const label = quest.next
    ? t('wallet.quest', { level: t(getReputationLabelKey(quest.next)), have: Math.min(quest.have, quest.need), need: quest.need })
    : t('wallet.quest.top', { level: t(getReputationLabelKey(quest.level)) });

  return (
    <div role="img" aria-label={label} className={cn('grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5', className)}>
      <span className="flex gap-1">
        {Array.from({ length: cells.count }, (_, index) => (
          <span key={index} className="relative h-3.5 max-w-[34px] flex-1 overflow-hidden rounded-[4px] bg-canvas-deep">
            {index < cells.lit && (
              <span
                style={{ '--i': index }}
                className={cn(
                  'absolute inset-0 inset-shadow-avatar',
                  lit[zone],
                  isEntering && 'animate-cell-in [animation-delay:calc(var(--i)*90ms)]'
                )}
              />
            )}
            {index === cells.lit && (
              <span className={cn('absolute inset-0 rounded-[4px] ring-[1.5px] ring-inset', nextRing[zone])}>
                <span className={cn('absolute inset-0 animate-next-cell opacity-0', nextGlow[zone])} />
              </span>
            )}
          </span>
        ))}
      </span>
      <span className="text-note font-bold text-ink-2 tabular-nums">
        {quest.next ? t('quest.score', { have: Math.min(quest.have, quest.need), need: quest.need }) : t('quest.top')}
      </span>
      <LevelBadge level={zone} isLocked={quest.next !== null} className="h-[34px] pr-3 pl-2.5 text-sm" />
    </div>
  );
}
