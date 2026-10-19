import { LevelBadge } from '@/components/identity/LevelBadge';
import { useTranslation } from '@/i18n/useTranslation';
import { getReputationLabelKey, questCells, type LevelQuest, type ReputationLevel } from '@/lib/reputation';
import { cn } from '@/lib/utils';

/** A level's colours on the way to it: a cell done, and the ring and glow of the next one. */
const ZONE: Record<ReputationLevel, { lit: string; ring: string; glow: string }> = {
  new: { lit: 'bg-level-new', ring: 'ring-level-new', glow: 'bg-level-new-soft' },
  unreliable: { lit: 'bg-orange', ring: 'ring-orange', glow: 'bg-orange-soft' },
  fair: { lit: 'bg-sun', ring: 'ring-sun', glow: 'bg-sun-soft' },
  honorable: { lit: 'bg-good', ring: 'ring-good', glow: 'bg-good-soft' },
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
  const colours = ZONE[zone];
  const cells = questCells(quest);
  const { label, score } = quest.next
    ? {
        label: t('wallet.quest', { level: t(getReputationLabelKey(quest.next)), have: quest.have, need: quest.need }),
        score: t('quest.score', { have: quest.have, need: quest.need }),
      }
    : { label: t('wallet.quest.top', { level: t(getReputationLabelKey(quest.level)) }), score: t('quest.top') };

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
                  colours.lit,
                  isEntering && 'animate-cell-in [animation-delay:calc(var(--i)*90ms)]'
                )}
              />
            )}
            {index === cells.lit && (
              <span className={cn('absolute inset-0 rounded-[4px] ring-[1.5px] ring-inset', colours.ring)}>
                <span className={cn('absolute inset-0 animate-next-cell opacity-0', colours.glow)} />
              </span>
            )}
          </span>
        ))}
      </span>
      <span className="text-note font-bold text-ink-2 tabular-nums">{score}</span>
      <LevelBadge level={zone} isLocked={quest.next !== null} className="h-[34px] pr-3 pl-2.5 text-sm" />
    </div>
  );
}
