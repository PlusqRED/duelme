import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface SafeLockProps {
  /** The money is locked in: the shackle is down, on the sun. */
  isShut?: boolean;
  /** The safe is being shown with money to take: the shackle springs open. */
  isOpening?: boolean;
  className?: string;
}

/** The contract safe's lock, a round paper badge whose shackle stands open until the safe shuts. */
export function SafeLock({ isShut = false, isOpening = false, className }: SafeLockProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-10 place-items-center rounded-full bg-paper text-ink transition-colors duration-300',
        isShut && 'bg-sun',
        className
      )}
    >
      <Icon
        name="safe"
        className={cn(
          'size-[22px] overflow-visible stroke-[2.2] [&>path:first-of-type]:-translate-y-[3.5px] [&>path:first-of-type]:transition-[translate] [&>path:first-of-type]:duration-400 [&>path:first-of-type]:ease-spring',
          isShut && '[&>path:first-of-type]:translate-y-0',
          isOpening && '[&>path:first-of-type]:animate-unlock'
        )}
      />
    </span>
  );
}
