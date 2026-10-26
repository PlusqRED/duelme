'use client';

import { useId, useMemo, useState } from 'react';
import { CatalogShelf } from '@/components/game/CatalogShelf';
import { CreateDuelInvite } from '@/components/landing/CreateDuelInvite';
import { SectionHead } from '@/components/landing/SectionHead';
import { PageColumn } from '@/components/layout/PageColumn';
import { FilterPill } from '@/components/lists/FilterPill';
import { SearchField } from '@/components/lists/SearchField';
import { useGames } from '@/hooks/useGames';
import { useTranslation } from '@/i18n/useTranslation';
import { getCategoryLabelKey, type GameCategory } from '@/lib/game';
import { catalogGames, mostPlayed, shelvesOf, type ShelfGuide } from '@/lib/gameShelves';
import { gameInk } from '@/lib/gameTile';

interface GameCatalogProps {
  /** The games with a guide, handed in by the server: the shelves it draws, before the catalog answers. */
  guides: readonly ShelfGuide[];
}

/**
 * Every game, on a shelf per category: a search, the categories as pills each in its own ink with
 * how many games it holds, and the shelves, each played most first. The server draws the guides'
 * games, so the page search engines read lists them all under their categories; the catalog's own
 * count of duels and the games players added come in after. A game that is not here is added by
 * naming it in a new duel.
 */
export function GameCatalog({ guides }: GameCatalogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const [category, setCategory] = useState<GameCategory | null>(null);
  const [query, setQuery] = useState('');
  const search = query.trim();
  // The backend searches, so a game past the first page of the catalog is still found by name.
  const { games: read, isRead } = useGames(undefined, search || undefined);
  const games = useMemo(() => catalogGames(isRead ? read : undefined, guides, search), [isRead, read, guides, search]);
  const shelves = useMemo(() => shelvesOf(games), [games]);
  const shown = category ? shelves.filter((shelf) => shelf.category === category) : shelves;
  const isNarrowed = category !== null || search !== '';
  const top = isNarrowed ? null : mostPlayed(games);
  const most = mostPlayed(games)?.duelCount || 1;

  return (
    <PageColumn>
      <SectionHead isPageTitle titleId={titleId} title={t('games.title')} subtitle={t('games.subtitle')} />
      <div className="mb-[clamp(32px,4vw,48px)] grid gap-3">
        <SearchField value={query} onChange={setQuery} placeholder={t('games.searchPlaceholder')} />
        <div role="group" aria-label={t('games.categoryFilterLabel')} className="flex flex-wrap gap-2 max-xs:swipe-strip max-xs:flex-nowrap">
          <FilterPill isPressed={category === null} onClick={() => setCategory(null)} count={games.length}>
            {t('games.allCategories')}
          </FilterPill>
          {shelves.map((shelf) => (
            <FilterPill
              key={shelf.category}
              isPressed={category === shelf.category}
              onClick={() => setCategory(category === shelf.category ? null : shelf.category)}
              count={shelf.games.length}
            >
              <i aria-hidden="true" style={{ '--tone': gameInk(shelf.category) }} className="size-2.5 rounded-full bg-(--tone)" />
              {t(getCategoryLabelKey(shelf.category))}
            </FilterPill>
          ))}
        </div>
      </div>

      <div className="grid gap-[clamp(40px,5vw,64px)]">
        {shown.map((shelf) => (
          <CatalogShelf key={shelf.category} shelf={shelf} most={most} topSlug={top?.slug ?? null} />
        ))}
      </div>

      {shown.length === 0 ? (
        <CreateDuelInvite
          variant="card"
          title={t(isNarrowed ? 'games.noMatches' : 'games.noGames')}
          description={t('games.addByDuel')}
        />
      ) : (
        <CreateDuelInvite
          variant="strip"
          title={t('games.missingTitle')}
          description={t('games.addByDuel')}
          className="mt-[clamp(40px,5vw,64px)]"
        />
      )}
    </PageColumn>
  );
}
