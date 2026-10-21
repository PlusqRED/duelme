import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DeskTitleProps {
  id: string;
  /** How many there are, on a chip beside the title. */
  count: number;
  /** What it heads waits on the reader now: a live dot before the title. */
  isLive?: boolean;
  className?: string;
  children: ReactNode;
}

/** A dashboard part's heading, with its count. */
export function DeskTitle({ id, count, isLive = false, className, children }: DeskTitleProps) {
  return (
    <h2 id={id} className={cn('mb-3.5 flex items-center gap-2.5 text-lead tracking-[-0.02em]', className)}>
      {isLive && (
        <i
          aria-hidden="true"
          className="relative size-2.5 shrink-0 rounded-full bg-ink after:absolute after:inset-0 after:animate-on-air after:rounded-full after:bg-ink"
        />
      )}
      <span>{children}</span>
      <span className="inline-grid h-7 min-w-7 place-items-center rounded-full bg-canvas-deep px-2 text-sm font-strong tracking-normal text-ink-2 tabular-nums">
        {count}
      </span>
    </h2>
  );
}
