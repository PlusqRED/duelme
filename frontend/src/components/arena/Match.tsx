import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const PAUSED_STRIPES = 'bg-[repeating-linear-gradient(90deg,var(--color-ink-3)_0_6px,transparent_6px_10px)]';

interface MatchProps {
  label: string;
  /** The players are talking of calling the duel off: the bar stops, striped. */
  isPaused?: boolean;
}

/** The match being played over the safe, its progress a bar sweeping back and forth. */
export function Match({ label, isPaused = false }: MatchProps) {
  return (
    <p className="absolute bottom-[calc(100%+30px)] left-1/2 inline-flex h-8 max-w-[calc(100%+80px)] -translate-x-1/2 animate-pop items-center gap-1.5 overflow-hidden rounded-full border border-line bg-canvas px-3 text-note font-label whitespace-nowrap">
      <Icon name={isPaused ? 'pause' : 'gamepad'} className="size-[17px] shrink-0" />
      <span className="truncate">{label}</span>
      <i
        aria-hidden="true"
        className={cn(
          'absolute bottom-0 left-0 h-[3px] rounded-[3px]',
          isPaused ? cn('w-full', PAUSED_STRIPES) : 'w-[36%] animate-scan bg-ink'
        )}
      />
    </p>
  );
}
