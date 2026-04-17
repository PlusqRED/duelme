'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, Loader2, Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreateGameInline } from '@/components/game/CreateGameInline';
import { GameSearchEmptyState } from '@/components/game/GameSearchEmptyState';
import { GameSearchResultRow } from '@/components/game/GameSearchResultRow';
import { GameSelect } from '@/components/game/GameSelect';
import { GAME_CATALOG_QUERY_KEY, useGameCatalog } from '@/hooks/useGameCatalog';
import { useTranslation } from '@/i18n/useTranslation';
import type { Game } from '@/lib/game';
import { createGameSearcher } from '@/lib/gameSearch';

interface GamePickerProps {
  selectedSlug: string;
  onSelect: (game: Game) => void;
}

const POPULAR_LIMIT = 6;
const SEARCH_MAX_LENGTH = 50;

export function GamePicker({ selectedSlug, onSelect }: GamePickerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { games, isLoading } = useGameCatalog();
  const [query, setQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const popularGames = useMemo(
    () => [...games].sort((a, b) => b.duelCount - a.duelCount).slice(0, POPULAR_LIMIT),
    [games]
  );

  const popularSlugs = useMemo(
    () => new Set(popularGames.map((game) => game.slug)),
    [popularGames]
  );

  const otherGames = useMemo(
    () =>
      [...games]
        .filter((game) => !popularSlugs.has(game.slug))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [games, popularSlugs]
  );

  const selectedGame = useMemo(
    () => (selectedSlug ? games.find((game) => game.slug === selectedSlug) ?? null : null),
    [games, selectedSlug]
  );

  const searcher = useMemo(() => createGameSearcher(games), [games]);
  const searchResults = useMemo(() => searcher.search(query), [searcher, query]);

  function handleQueryChange(next: string) {
    setQuery(next);
    if (next.length > 0) setIsCreateOpen(false);
  }

  function handleCreated(game: Game) {
    // Insert the new game into the catalog cache so it appears immediately in
    // the picker, then invalidate so the next refetch pulls the canonical
    // server-stamped row. `createGame` has already awaited backend persistence,
    // so the follow-up refetch will see it.
    queryClient.setQueryData<Game[]>(GAME_CATALOG_QUERY_KEY, (prev) => {
      if (!prev) return [game];
      if (prev.some((existing) => existing.slug === game.slug)) return prev;
      return [...prev, game];
    });
    void queryClient.invalidateQueries({ queryKey: GAME_CATALOG_QUERY_KEY });
    setIsCreateOpen(false);
    setQuery('');
    onSelect(game);
  }

  const showResults = query.trim().length > 0;
  const showEmptyResults = showResults && searchResults.length === 0 && !isLoading;
  const showSelectedPreview =
    !showResults && selectedGame !== null && !popularSlugs.has(selectedGame.slug);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder={t('gamePicker.searchPlaceholder')}
          maxLength={SEARCH_MAX_LENGTH}
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
              onSelect={() => onSelect(game)}
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
          {showSelectedPreview && selectedGame && (
            <Section
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />}
              label={t('gamePicker.selected')}
            >
              <GameSearchResultRow
                game={selectedGame}
                matchIndices={[]}
                isSelected
                onSelect={() => onSelect(selectedGame)}
              />
            </Section>
          )}
          {popularGames.length > 0 && (
            <Section
              icon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}
              label={t('gamePicker.popular')}
            >
              <div className="flex flex-col gap-2">
                {popularGames.map((game) => (
                  <GameSearchResultRow
                    key={game.slug}
                    game={game}
                    matchIndices={[]}
                    isSelected={selectedSlug === game.slug}
                    onSelect={() => onSelect(game)}
                  />
                ))}
              </div>
            </Section>
          )}
          {otherGames.length > 0 && (
            <GameSelect
              games={otherGames}
              selectedSlug={selectedSlug}
              onSelect={onSelect}
              label={t('gamePicker.more')}
              placeholder={t('gamePicker.morePlaceholder')}
            />
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
