import type { SeatSide } from '@/lib/duel';
import { cn } from '@/lib/utils';

/**
 * The way between a seat and the safe, lit in the seat's colour once its stake is inside. Its stage
 * gives the safe's height as `--box`.
 */
export function Track({ side, isLit }: { side: SeatSide; isLit: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-side={side}
      className={cn(
        'relative mt-[calc(var(--box)/2-1px)] h-0 border-t-2 border-dashed border-line-strong',
        'after:absolute after:inset-x-0 after:-top-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-red after:transition-transform after:duration-500 data-[side=opponent]:after:origin-right data-[side=opponent]:after:bg-blue',
        isLit && 'after:scale-x-100'
      )}
    />
  );
}
