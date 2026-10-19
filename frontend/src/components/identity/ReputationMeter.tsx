import type { ReputationLevel } from '@/lib/reputation';
import { cn } from '@/lib/utils';

const BAR_HEIGHTS = ['h-1.5', 'h-[9px]', 'h-3'];

/** How many of the three bars a level fills, and in what colour; New is drawn as empty outlines. */
const levels: Record<ReputationLevel, { filled: number; colour: string }> = {
  new: { filled: 0, colour: '' },
  unreliable: { filled: 1, colour: 'bg-orange' },
  fair: { filled: 2, colour: 'bg-sun-bar' },
  honorable: { filled: 3, colour: 'bg-good' },
};

interface ReputationMeterProps {
  level: ReputationLevel;
  className?: string;
}

/** Three rising bars: one for Risky, two for Mixed, three for Reliable, outlines for New. */
export function ReputationMeter({ level, className }: ReputationMeterProps) {
  const { filled, colour } = levels[level];

  return (
    <span aria-hidden="true" className={cn('inline-flex items-end gap-0.5', className)}>
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={height}
          className={cn(
            'w-1 rounded-[2px]',
            height,
            level === 'new' ? 'ring-1 ring-ink-3 ring-inset' : index < filled ? colour : 'bg-line-strong'
          )}
        />
      ))}
    </span>
  );
}
