'use client';

import { use } from 'react';
import Link from 'next/link';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n/useTranslation';
import { ArrowLeft, Gamepad2 } from 'lucide-react';

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { t } = useTranslation();
  const { game, isLoading } = useGame(slug);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-sm text-slate-500">{t('game.notFound')}</p>
        <Link href="/games" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          {t('popularGames.viewAll')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/games"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.games')}
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <Gamepad2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{game.name}</h1>
              <span className="text-sm text-white/80">{t(`category.${game.category}` as Parameters<typeof t>[0])}</span>
            </div>
          </div>
          <div className="mt-6 flex gap-8">
            <div>
              <p className="text-2xl font-bold">{game.duelCount}</p>
              <p className="text-sm text-white/70">{t('games.duelsCount')}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('game.recentDuels')}</h2>
          <p className="text-sm text-slate-500">{t('game.noDuels')}</p>
        </div>
      </div>
    </div>
  );
}
