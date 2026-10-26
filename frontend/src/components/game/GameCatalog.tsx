'use client';

import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { CatalogGame } from '@/components/game/CatalogGame';
import { CreateDuelInvite } from '@/components/landing/CreateDuelInvite';
import { SectionHead } from '@/components/landing/SectionHead';
import { PageColumn } from '@/components/layout/PageColumn';
import { FilterPill } from '@/components/lists/FilterPill';
import { SearchField } from '@/components/lists/SearchField';
import { useGames } from '@/hooks/useGames';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import { useTranslation } from '@/i18n/useTranslation';
import { byPopularity, GAME_CATEGORIES, getCategoryLabelKey, type GameCategory } from '@/lib/game';
import { gameInk } from '@/lib/gameTile';

interface GameCatalogProps {
  /** Under the heading: the way to the games with a guide, drawn on the server. */
  shortcuts?: ReactNode;
}

/**
 * Every game players have duelled in, the most played first: a search, the categories as pills
 * each in its own ink, and the games as cartridges on a shelf whose bars grow to their share the
 * first time the shelf is seen. A game that is not here is added by naming it in a new duel.
 */
export function GameCatalog({ shortcuts }: GameCatalogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const [category, setCategory] = useState<GameCategory | null>(null);
  const [query, setQuery] = useState('');
  const search = query.trim();
  // The backend filters, so a game past the first page of the catalog is still found by name.
  const { games, isLoading } = useGames(category ?? undefined, search || undefined);
  const shelf = useMemo(() => [...games].sort(byPopularity), [games]);
  const shelfRef = useRef<HTMLUListElement>(null);
  const isSeen = useSeenOnce(shelfRef, 0.3);
  const isNarrowed = category !== null || search !== '';
  const most = shelf[0]?.duelCount || 1;

  return (
    <PageColumn>
      <SectionHead isPageTitle titleId={titleId} title={t('games.title')} subtitle={t('games.subtitle')} />
      {shortcuts}
      <div className="mb-6 grid gap-3">
        <SearchField value={query} onChange={setQuery} placeholder={t('games.searchPlaceholder')} />
        <div role="group" aria-label={t('games.categoryFilterLabel')} className="flex flex-wrap gap-2 max-xs:swipe-strip max-xs:flex-nowrap">
          <FilterPill isPressed={category === null} onClick={() => setCategory(null)}>
            {t('games.allCategories')}
          </FilterPill>
          {GAME_CATEGORIES.map((option) => (
            <FilterPill
              key={option}
              isPressed={category === option}
              onClick={() => setCategory(category === option ? null : option)}
            >
              <i aria-hidden="true" style={{ '--tone': gameInk(option) }} className="size-2.5 rounded-full bg-(--tone)" />
              {t(getCategoryLabelKey(option))}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Always on the page, even while it loads: the bars grow once, when it is first seen. */}
      <ul
        ref={shelfRef}
        aria-labelledby={titleId}
        data-pending={isSeen ? undefined : ''}
        className="group/catalog grid gap-3.5 xs:grid-cols-2 wide:grid-cols-3"
      >
        {isLoading && shelf.length === 0
          ? [0, 1, 2].map((index) => (
              <li key={index} aria-hidden="true" className="h-[118px] animate-pulse rounded-tile bg-paper max-xs:not-first:hidden" />
            ))
          : shelf.map((game, index) => (
              // A game a new filter brings rises into place; one it keeps stays put.
              <li key={game.slug} style={{ '--i': index }} className="animate-rise [animation-delay:calc(min(var(--i),8)*45ms)]">
                <CatalogGame
                  game={game}
                  share={game.duelCount / most}
                  index={index}
                  isTop={index === 0 && !isNarrowed && game.duelCount > 0}
                />
              </li>
            ))}
      </ul>

      {!isLoading && shelf.length === 0 ? (
        <CreateDuelInvite
          variant="card"
          title={t(isNarrowed ? 'games.noMatches' : 'games.noGames')}
          description={t('games.addByDuel')}
        />
      ) : (
        <CreateDuelInvite variant="strip" title={t('games.missingTitle')} description={t('games.addByDuel')} />
      )}
    </PageColumn>
  );
}
