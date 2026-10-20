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
  /** On the navy band: the subtitle in a softened paper instead of ink. */
  isOnNavy?: boolean;
  /** A page's own head, the one heading of its first level, rather than a section's. */
  isPageTitle?: boolean;
  className?: string;
}

/** A landing section's heading, or a page's, what it is for, and whatever goes with them. */
export function SectionHead({
  titleId,
  title,
  subtitle,
  badge,
  children,
  isOnNavy = false,
  isPageTitle = false,
  className,
}: SectionHeadProps) {
  const Heading = isPageTitle ? 'h1' : 'h2';

  return (
    <div className={cn('mb-[clamp(24px,3vw,40px)] grid max-w-[780px] gap-3', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Heading id={titleId} className="text-h2">
          {title}
        </Heading>
        {badge}
      </div>
      <p className={cn('max-w-[60ch] text-lg', isOnNavy ? 'text-paper/74' : 'text-ink-2')}>{subtitle}</p>
      {children}
    </div>
  );
}
