import type { ReactNode } from 'react';
import { PageColumn } from '@/components/layout/PageColumn';
import { PROSE_TEXT } from '@/components/layout/ProseSection';

interface ProsePageProps {
  title: string;
  /** Under the heading, a step quieter: when the page was last changed, say. */
  note?: string;
  intro: string;
  children: ReactNode;
}

/** A page of plain text: its heading and what it is about, then its parts (`ProseSection`). */
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
