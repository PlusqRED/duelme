'use client';

import { ReputationMeter } from '@/components/identity/ReputationMeter';
import { useTranslation } from '@/i18n/useTranslation';
import { getReputationLabelKey, type ReputationLevel } from '@/lib/reputation';
import { cn } from '@/lib/utils';

const faces: Record<ReputationLevel, string> = {
  new: 'bg-level-new-soft text-level-new-ink',
  unreliable: 'bg-orange-soft text-orange-ink',
  fair: 'bg-sun-soft text-sun-ink',
  honorable: 'bg-good-soft text-good-ink',
};

interface ReputationPillProps {
  level: ReputationLevel;
  className?: string;
}

/** A level as a pill in its colour, with its meter and its name. */
export function ReputationPill({ level, className }: ReputationPillProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full pr-[9px] pl-[7px] text-note font-strong',
        faces[level],
        className
      )}
    >
      <ReputationMeter level={level} />
      {t(getReputationLabelKey(level))}
    </span>
  );
}
