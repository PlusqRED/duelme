'use client';

import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import type { Game } from '@/lib/game';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Gamepad2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {game.name}
          </h3>
          <span className="text-xs text-slate-400">{t(`category.${game.category}` as TranslationKey)}</span>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-4 text-xs text-slate-500">
        <span>{game.duelCount} {t('games.duelsCount')}</span>
      </div>
    </Link>
  );
}
