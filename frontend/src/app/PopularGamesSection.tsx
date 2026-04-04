'use client';

import Link from 'next/link';
import { GameCard } from '@/components/game/GameCard';
import { useGames } from '@/hooks/useGames';
import { useTranslation } from '@/i18n/useTranslation';
import { ArrowRight } from 'lucide-react';

export function PopularGamesSection() {
  const { t } = useTranslation();
  const { games, isLoading } = useGames();

  if (isLoading || games.length === 0) return null;

  return (
    <section id="games" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('popularGames.title')}</h2>
          <p className="mt-1 text-slate-500">{t('popularGames.subtitle')}</p>
        </div>
        <Link
          href="/games"
          className="hidden items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 sm:flex"
        >
          {t('popularGames.viewAll')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.slice(0, 6).map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
      <div className="mt-6 text-center sm:hidden">
        <Link href="/games" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          {t('popularGames.viewAll')} →
        </Link>
      </div>
    </section>
  );
}
