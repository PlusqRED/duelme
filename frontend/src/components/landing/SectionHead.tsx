import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadProps {
  /** The heading's id, for the section's `aria-labelledby`. */
  titleId: string;
  title: string;
  subtitle: string;
  /** Beside the title: a count, say. */
  badge?: ReactNode;
  /** Under the subtitle: the way to the rest, say. */
  children?: ReactNode;
  className?: string;
}

/** A landing section's heading, what the section is for, and whatever goes with them. */
export function SectionHead({ titleId, title, subtitle, badge, children, className }: SectionHeadProps) {
  return (
    <div className={cn('mb-[clamp(24px,3vw,40px)] grid max-w-[780px] gap-3', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id={titleId} className="text-h2">
          {title}
        </h2>
        {badge}
      </div>
      <p className="max-w-[60ch] text-lg text-ink-2">{subtitle}</p>
      {children}
    </div>
  );
}
