import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { useTranslation } from '@/i18n/useTranslation';
import { getReputationLabelKey, type ReputationLevel } from '@/lib/reputation';
import { cn } from '@/lib/utils';

const icons: Record<ReputationLevel, IconName> = {
  new: 'sparkles',
  unreliable: 'shield-alert',
  fair: 'shield-question',
  honorable: 'shield-check',
};

const reached: Record<ReputationLevel, string> = {
  new: 'bg-level-new text-ink',
  unreliable: 'bg-orange-ink text-paper',
  fair: 'bg-sun text-ink',
  honorable: 'bg-good-ink text-paper',
};

const locked: Record<ReputationLevel, string> = {
  new: 'border-level-new-ink text-level-new-ink',
  unreliable: 'border-orange-ink text-orange-ink',
  fair: 'border-sun-ink text-sun-ink',
  honorable: 'border-good-ink text-good-ink',
};

interface LevelBadgeProps {
  level: ReputationLevel;
  /** A level still to reach: its colour only as a dashed outline, with a lock. */
  isLocked?: boolean;
  className?: string;
}

/** A level as the badge a player earns, solid in its colour with its shield. The caller sizes it. */
export function LevelBadge({ level, isLocked = false, className }: LevelBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-[5px] rounded-full font-extrabold',
        isLocked ? cn('border-[1.5px] border-dashed bg-paper', locked[level]) : reached[level],
        className
      )}
    >
      <Icon name={isLocked ? 'lock' : icons[level]} className="size-4" />
      {t(getReputationLabelKey(level))}
    </span>
  );
}
