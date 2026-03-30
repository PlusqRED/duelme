'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { GameCard } from '@/components/game/GameCard';
import { useGames } from '@/hooks/useGames';
import { useTranslation } from '@/i18n/useTranslation';
import { GAME_CATEGORIES, type GameCategory } from '@/lib/game';
import { Search, Gamepad2 } from 'lucide-react';

export default function GamesPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<GameCategory | undefined>(undefined);
  const [search, setSearch] = useState('');
  const { games, isLoading } = useGames(category, search || undefined);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('games.title')}</h1>
        <p className="mt-1 text-slate-500">{t('games.subtitle')}</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('games.searchPlaceholder')}
            className="h-10 border-slate-200 bg-white pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory(undefined)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              !category ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('games.allCategories')}
          </button>
          {GAME_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === category ? undefined : cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                category === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t(`category.${cat}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <Gamepad2 className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">
            {search ? t('games.noMatches') : t('games.noGames')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
