'use client';

import { use } from 'react';
import Link from 'next/link';
import { useGame } from '@/hooks/useGame';
import { useDuelsByGame } from '@/hooks/useDuelsByGame';
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
  const { duels, isLoading: duelsLoading } = useDuelsByGame(game?.slug);

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
          {duelsLoading ? (
            <div className="flex justify-center py-8">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : duels.length === 0 ? (
            <p className="text-sm text-slate-500">{t('game.noDuels')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {duels.map((d) => (
                <li key={`${d.chainId}-${d.duelId}`} className="flex items-center justify-between py-3">
                  <Link href={`/duel/${d.duelId}`} className="text-sm font-medium text-indigo-600 hover:underline">
                    Duel #{d.duelId}
                  </Link>
                  <span className="text-xs text-slate-400">{d.creatorAddress.slice(0, 6)}...{d.creatorAddress.slice(-4)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
