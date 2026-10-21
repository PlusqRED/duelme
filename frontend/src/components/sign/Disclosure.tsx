import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface DisclosureProps {
  summary: string;
  children: ReactNode;
  className?: string;
}

/** Something most players never need, folded away under a line that opens it. */
export function Disclosure({ summary, children, className }: DisclosureProps) {
  return (
    <details className={cn('group w-full rounded-[14px] bg-canvas text-left', className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-[14px] px-3.5 text-sm font-strong text-ink-2 [&::-webkit-details-marker]:hidden">
        <Icon name="chevron" className="size-4 -rotate-90 transition-transform duration-200 group-open:rotate-0" />
        <span>{summary}</span>
      </summary>
      {children}
    </details>
  );
}
