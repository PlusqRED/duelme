import type { ReactNode } from 'react';
import { PageColumn } from '@/components/layout/PageColumn';
import { cn } from '@/lib/utils';

/** A paragraph of a page of plain text: a comfortable measure, the body size, ink a step softer. */
export const PROSE_TEXT = 'max-w-[68ch] text-body text-pretty text-ink-2';

interface ProseSectionProps {
  title: string;
  /** Its first paragraph; most parts say no more. */
  text?: string;
  /** What follows the paragraph: more of them, a link, a list. */
  children?: ReactNode;
  className?: string;
}

/** One part of a page of plain text — the privacy page, how a duel works — under a rule and its heading. */
export function ProseSection({ title, text, children, className }: ProseSectionProps) {
  return (
    <section className={cn('grid gap-2.5 border-t border-line pt-6', className)}>
      <h2 className="text-lead">{title}</h2>
      {text && <p className={PROSE_TEXT}>{text}</p>}
      {children}
    </section>
  );
}

interface ProsePageProps {
  title: string;
  /** Under the heading, a step quieter: when the page was last changed, say. */
  note?: string;
  intro: string;
  children: ReactNode;
}

/** A page of plain text: its heading and what it is about, then its parts. */
export function ProsePage({ title, note, intro, children }: ProsePageProps) {
  return (
    <PageColumn className="grid max-w-[760px] gap-7">
      <header className="grid gap-2">
        <h1 className="text-h1 hyphens-auto [overflow-wrap:anywhere]">{title}</h1>
        {note && <p className="text-body-sm text-ink-3">{note}</p>}
        <p className={PROSE_TEXT}>{intro}</p>
      </header>
      {children}
    </PageColumn>
  );
}
