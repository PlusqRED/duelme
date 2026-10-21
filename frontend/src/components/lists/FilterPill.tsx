import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FilterPillProps {
  isPressed: boolean;
  onClick: () => void;
  /** How many the filter would show, when it says. */
  count?: number;
  children: ReactNode;
}

/** One filter of a list: a pill that turns navy while it is on, with how many it holds beside its name. */
export function FilterPill({ isPressed, onClick, count, children }: FilterPillProps) {
  return (
    <button
      type="button"
      aria-pressed={isPressed}
      onClick={onClick}
      className={cn(
        'group/pill relative inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-paper px-3.5 text-body-sm font-label whitespace-nowrap text-ink transition-[border-color,background-color,color,translate] duration-200 ease-press',
        'hover:border-ink-3 active:translate-y-px aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper'
      )}
    >
      {children}
      {count !== undefined && (
        <b className="font-strong text-ink-3 tabular-nums group-aria-pressed/pill:text-paper/70">{count}</b>
      )}
    </button>
  );
}
