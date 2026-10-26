import type { ReactNode } from 'react';
import { PageColumn } from '@/components/layout/PageColumn';

interface ProseSectionProps {
  title: string;
  children: ReactNode;
}

/** One part of a page of plain text — the privacy page, how a duel works — under a rule and its heading. */
export function ProseSection({ title, children }: ProseSectionProps) {
  return (
    <section className="grid gap-2.5 border-t border-line pt-6">
      <h2 className="text-lead">{title}</h2>
      {children}
    </section>
  );
}

/** A paragraph of such a page: a comfortable measure, the body size, ink a step softer. */
export const PROSE_TEXT = 'max-w-[68ch] text-body text-pretty text-ink-2';

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
