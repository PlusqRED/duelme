import type { ReactNode } from 'react';
import { PageColumn } from '@/components/layout/PageColumn';
import { cn } from '@/lib/utils';

interface LostPageProps {
  /** What the mark's three pieces carry: the red seat, the contract's square, the blue seat. */
  glyphs: readonly [string, string, string];
  title: string;
  text: string;
  /** The ways on from here, as buttons. */
  children: ReactNode;
}

/**
 * A page with nothing to show — no such address, no such game, a screen that failed — drawn as
 * the brand mark grown big: the two seats slide in to the contract's square and carry the code
 * between them, and the ways on sit under it.
 */
export function LostPage({ glyphs: [left, middle, right], title, text, children }: LostPageProps) {
  return (
    <PageColumn className="grid min-h-[min(70vh,640px)] content-center justify-items-center text-center">
      <p
        aria-hidden="true"
        className="mb-[clamp(24px,4vw,40px)] flex items-center gap-[clamp(8px,1.4vw,14px)] text-[clamp(1.9rem,1.2rem+2.6vw,3rem)] leading-none font-extrabold text-paper"
      >
        <Seat glyph={left} className="bg-red shadow-[0_4px_0_var(--color-red-deep)] [--from:-48px]" />
        <span className="grid size-[clamp(76px,11vw,112px)] animate-rise place-items-center rounded-[clamp(20px,3vw,30px)] bg-ink shadow-[0_5px_0_var(--color-ink-edge)]">
          {middle}
        </span>
        <Seat glyph={right} className="bg-blue shadow-[0_4px_0_var(--color-blue-deep)] [--from:48px]" />
      </p>
      <h1 className="max-w-[22ch] text-h2">{title}</h1>
      <p className="mt-3 max-w-[46ch] text-lg text-ink-2">{text}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div>
    </PageColumn>
  );
}

function Seat({ glyph, className }: { glyph: string; className: string }) {
  return (
    <span
      className={cn(
        'grid size-[clamp(56px,8vw,84px)] animate-take-seat place-items-center rounded-full [animation-delay:120ms]',
        className
      )}
    >
      {glyph}
    </span>
  );
}
