import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageColumnProps {
  children: ReactNode;
  className?: string;
}

/** A page's column under the top bar: the room beside it, a little above, and a section's room below. */
export function PageColumn({ children, className }: PageColumnProps) {
  return (
    <div className={cn('mx-auto w-full max-w-page px-gutter pt-[clamp(24px,4vw,48px)] pb-section', className)}>
      {children}
    </div>
  );
}
