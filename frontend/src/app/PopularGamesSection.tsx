'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GameCard } from '@/components/game/GameCard';
import { useGames } from '@/hooks/useGames';
import { useTranslation } from '@/i18n/useTranslation';
import { ArrowRight } from 'lucide-react';

export function PopularGamesSection() {
  const { t } = useTranslation();
  const { games, isLoading } = useGames();
  const featuredGames = games.slice(0, 6);

  return (
    <section id="games" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('popularGames.title')}</h2>
          <p className="mt-1 text-slate-500">{t('popularGames.subtitle')}</p>
        </div>
        {!isLoading && featuredGames.length > 0 && (
          <Link
            href="/games"
            className="hidden items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 sm:flex"
          >
            {t('popularGames.viewAll')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80"
            />
          ))}
        </div>
      ) : featuredGames.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredGames.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
          <div className="mt-6 text-center sm:hidden">
            <Link href="/games" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              {t('popularGames.viewAll')} →
            </Link>
          </div>
        </>
      ) : (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
            {t('popularGames.empty')}
          </p>
          <div className="mt-6">
            <Link href="/duel/create">
              <Button
                size="lg"
                className="rounded-2xl bg-slate-950 px-8 text-white hover:bg-slate-900"
              >
                {t('hero.cta')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
