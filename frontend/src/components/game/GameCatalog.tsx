'use client';

import { useId, useMemo, useState } from 'react';
import { CatalogShelf } from '@/components/game/CatalogShelf';
import { CreateDuelInvite } from '@/components/landing/CreateDuelInvite';
import { SectionHead } from '@/components/landing/SectionHead';
import { PageColumn } from '@/components/layout/PageColumn';
import { FilterPill } from '@/components/lists/FilterPill';
import { SearchField } from '@/components/lists/SearchField';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { useTranslation } from '@/i18n/useTranslation';
import { GAME_CATEGORIES, getCategoryLabelKey, type Game, type GameCategory } from '@/lib/game';
import { catalogGames, mostPlayed, shelvesOf } from '@/lib/gameShelves';
import { gameInk } from '@/lib/gameTile';

interface GameCatalogProps {
  /** The games with a guide, handed in by the server: the shelves it draws, before the catalog answers. */
  guides: readonly Game[];
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
  // The whole catalog, the create page's read, searched here: a name is found however it is spelled,
  // the same before the catalog answers as after.
  const { games: catalog } = useGameCatalog();
  const games = useMemo(() => catalogGames(catalog, guides, search), [catalog, guides, search]);
  const shelves = useMemo(() => shelvesOf(games), [games]);
  const shown = category ? shelves.filter((shelf) => shelf.category === category) : shelves;
  // The picked category keeps its pill when the search empties it, so the page shows why nothing is left.
  const pills = GAME_CATEGORIES.filter((each) => each === category || shelves.some((shelf) => shelf.category === each));
  const isNarrowed = category !== null || search !== '';
  const leader = mostPlayed(games);
  const most = leader?.duelCount || 1;

  return (
    <PageColumn>
      <SectionHead isPageTitle titleId={titleId} title={t('games.title')} subtitle={t('games.subtitle')} />
      <div className="mb-[clamp(32px,4vw,48px)] grid gap-3">
        <SearchField value={query} onChange={setQuery} placeholder={t('games.searchPlaceholder')} />
        <div role="group" aria-label={t('games.categoryFilterLabel')} className="flex flex-wrap gap-2 max-xs:swipe-strip max-xs:flex-nowrap">
          <FilterPill isPressed={category === null} onClick={() => setCategory(null)} count={games.length}>
            {t('games.allCategories')}
          </FilterPill>
          {pills.map((each) => (
            <FilterPill
              key={each}
              isPressed={category === each}
              onClick={() => setCategory(category === each ? null : each)}
              count={shelves.find((shelf) => shelf.category === each)?.games.length ?? 0}
            >
              <i aria-hidden="true" style={{ '--tone': gameInk(each) }} className="size-2.5 rounded-full bg-(--tone)" />
              {t(getCategoryLabelKey(each))}
            </FilterPill>
          ))}
        </div>
      </div>

      <div className="grid gap-[clamp(40px,5vw,64px)]">
        {shown.map((shelf) => (
          <CatalogShelf key={shelf.category} shelf={shelf} most={most} topSlug={isNarrowed ? null : (leader?.slug ?? null)} />
        ))}
      </div>

      {shown.length === 0 ? (
        // The guides' games are always there, so only a search or a pick can leave the page empty.
        <CreateDuelInvite
          variant="card"
          title={t('games.noMatches')}
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
