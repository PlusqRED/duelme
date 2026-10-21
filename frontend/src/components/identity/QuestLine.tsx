import { LevelBadge } from '@/components/identity/LevelBadge';
import { Icon } from '@/components/ui/icon';
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
  /** Before they light: the cells done still dark, for an entrance that starts later. */
  isWaiting?: boolean;
  /** The score under the cells, the badge beside both: for a card narrower than the menu's. */
  isStacked?: boolean;
  className?: string;
}

/**
 * The way to the next level as a quest: a cell per honored duel it needs, the ones done lit in the
 * next level's colour, the next one breathing, and the next level's badge still locked. At the top
 * there is no way left, so it says so in a line, without naming the level the badge beside it
 * already names.
 */
export function QuestLine({ quest, isEntering = false, isWaiting = false, isStacked = false, className }: QuestLineProps) {
  const { t } = useTranslation();

  if (!quest.next) {
    return (
      <p className={cn('flex items-center gap-2.5 text-note text-ink-2', className)}>
        <span
          className={cn(
            'grid size-7 flex-none place-items-center rounded-full bg-good-soft text-good-ink',
            isEntering && !isWaiting && 'animate-pop'
          )}
        >
          <Icon name="trophy" className="size-4" />
        </span>
        {t('quest.summit')}
      </p>
    );
  }

  const zone = quest.next;
  const colours = ZONE[zone];
  const cells = questCells(quest);
  const label = t('wallet.quest', { level: t(getReputationLabelKey(zone)), have: quest.have, need: quest.need });
  const score = t('quest.score', { have: quest.have, need: quest.need });

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5',
        isStacked && "grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 [grid-template-areas:'cells_goal'_'score_goal']",
        className
      )}
    >
      <span className={cn('flex gap-1', isStacked && '[grid-area:cells]')}>
        {Array.from({ length: cells.count }, (_, index) => (
          <span key={index} className="relative h-3.5 max-w-[34px] flex-1 overflow-hidden rounded-[4px] bg-canvas-deep">
            {index < cells.lit && !isWaiting && (
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
      <span className={cn('text-note font-bold text-ink-2 tabular-nums', isStacked && '[grid-area:score]')}>{score}</span>
      <LevelBadge level={zone} isLocked className={cn('h-[34px] pr-3 pl-2.5 text-sm', isStacked && '[grid-area:goal]')} />
    </div>
  );
}
