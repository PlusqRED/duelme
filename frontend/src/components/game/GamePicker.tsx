'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Loader2, Search, Sparkles, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreateGameInline } from '@/components/game/CreateGameInline';
import { GameSearchEmptyState } from '@/components/game/GameSearchEmptyState';
import { GameSearchResultRow } from '@/components/game/GameSearchResultRow';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { useRecentGame } from '@/hooks/useRecentGame';
import { useTranslation } from '@/i18n/useTranslation';
import type { Game } from '@/lib/game';
import { createGameSearcher } from '@/lib/gameSearch';

interface GamePickerProps {
  selectedSlug: string;
  onSelect: (game: Game) => void;
}

const POPULAR_LIMIT = 6;

export function GamePicker({ selectedSlug, onSelect }: GamePickerProps) {
  const { t } = useTranslation();
  const { games, isLoading } = useGameCatalog();
  const { recentGame, saveRecentGame } = useRecentGame();
  const [query, setQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const recentGameInCatalog = useMemo(
    () =>
      recentGame ? games.find((game) => game.slug === recentGame.slug) ?? null : null,
    [recentGame, games]
  );

  const popularGames = useMemo(() => {
    const excludedSlug = recentGameInCatalog?.slug;
    return [...games]
      .filter((game) => game.slug !== excludedSlug)
      .sort((a, b) => b.duelCount - a.duelCount)
      .slice(0, POPULAR_LIMIT);
  }, [games, recentGameInCatalog]);

  const searcher = useMemo(() => createGameSearcher(games), [games]);
  const searchResults = useMemo(() => searcher.search(query), [searcher, query]);

  function handleQueryChange(next: string) {
    setQuery(next);
    if (next.length > 0) setIsCreateOpen(false);
  }

  function handleSelect(game: Game) {
    saveRecentGame({ slug: game.slug, name: game.name, category: game.category });
    onSelect(game);
  }

  function handleCreated(game: Game) {
    setIsCreateOpen(false);
    setQuery('');
    handleSelect(game);
  }

  const showResults = query.trim().length > 0;
  const showEmptyResults = showResults && searchResults.length === 0 && !isLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder={t('gamePicker.searchPlaceholder')}
          maxLength={50}
          className="h-12 border-slate-200 bg-white pl-10 text-base"
          aria-label={t('gamePicker.searchPlaceholder')}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {showResults ? (
        <div className="flex flex-col gap-2">
          {searchResults.map(({ game, matchIndices }) => (
            <GameSearchResultRow
              key={game.slug}
              game={game}
              matchIndices={matchIndices}
              isSelected={selectedSlug === game.slug}
              onSelect={() => handleSelect(game)}
            />
          ))}
          {showEmptyResults && (
            <GameSearchEmptyState
              query={query}
              onCreateClick={() => setIsCreateOpen(true)}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {recentGameInCatalog && (
            <Section icon={<Star className="h-3.5 w-3.5" />} label={t('gamePicker.recent')}>
              <GameSearchResultRow
                game={recentGameInCatalog}
                matchIndices={[]}
                isSelected={selectedSlug === recentGameInCatalog.slug}
                onSelect={() => handleSelect(recentGameInCatalog)}
              />
            </Section>
          )}
          {popularGames.length > 0 && (
            <Section icon={<Sparkles className="h-3.5 w-3.5" />} label={t('gamePicker.popular')}>
              <div className="flex flex-col gap-2">
                {popularGames.map((game) => (
                  <GameSearchResultRow
                    key={game.slug}
                    game={game}
                    matchIndices={[]}
                    isSelected={selectedSlug === game.slug}
                    onSelect={() => handleSelect(game)}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => setIsCreateOpen((open) => !open)}
          aria-expanded={isCreateOpen}
          className="inline-flex w-full min-h-11 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <span>{t('gamePicker.createNew')}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isCreateOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isCreateOpen && (
          <div className="mt-3">
            <CreateGameInline initialName={query} onCreated={handleCreated} />
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
