'use client';

import { useId, useRef } from 'react';
import { CatalogGame } from '@/components/game/CatalogGame';
import { GameTile } from '@/components/identity/GameTile';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import { useTranslation } from '@/i18n/useTranslation';
import { getCategoryNoteKey, getCategoryShelfKey } from '@/lib/game';
import type { Shelf } from '@/lib/gameShelves';

interface CatalogShelfProps {
  shelf: Shelf;
  /** The most duels any game on the page has: what a full bar means. */
  most: number;
  /** The game played most of all, which wears the trophy; none while the page is narrowed. */
  topSlug: string | null;
}

/**
 * One category's games: its title beside a tile of its colour holding how many games it has, what
 * a duel in it is like, and the games as cartridges, the most played first. The bars of the played
 * ones grow the first time the shelf is seen.
 */
export function CatalogShelf({ shelf: { category, games }, most, topSlug }: CatalogShelfProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const isSeen = useSeenOnce(listRef, 0.3);

  return (
    <section aria-labelledby={titleId} className="grid gap-4 xs:gap-5">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 xs:gap-x-3.5">
        {/* A game's tile, the size of those on the shelf under it, so the category reads as the box they came in. */}
        <GameTile
          name={null}
          category={category}
          className="row-span-2 size-10 rounded-xl text-body tabular-nums xs:size-12 xs:rounded-[14px] xs:text-lead"
        >
          {games.length}
        </GameTile>
        <h2 id={titleId} className="self-end text-lead font-extrabold tracking-[-0.02em] xs:text-figure">
          {t(getCategoryShelfKey(category))}
        </h2>
        <p className="self-start text-body-sm text-ink-2">{t(getCategoryNoteKey(category))}</p>
      </header>
      <ul
        ref={listRef}
        aria-labelledby={titleId}
        data-pending={isSeen ? undefined : ''}
        className="group/shelf grid grid-cols-2 gap-2.5 xs:grid-cols-3 xs:gap-3 wide:grid-cols-4"
      >
        {games.map((game, index) => (
          // A game a new search or filter brings rises into place; one it keeps stays put.
          <li key={game.slug} style={{ '--i': index }} className="animate-rise [animation-delay:calc(min(var(--i),8)*45ms)]">
            <CatalogGame game={game} share={game.duelCount / most} isTop={game.slug === topSlug} />
          </li>
        ))}
      </ul>
    </section>
  );
}
