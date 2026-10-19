'use client';

import Link from 'next/link';
import { GameTile } from '@/components/identity/GameTile';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import type { Game } from '@/lib/game';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const { t, plural } = useTranslation();

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-3">
        <GameTile name={game.name} category={game.category} />
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {game.name}
          </h3>
          <span className="text-xs text-slate-400">{t(`category.${game.category}` as TranslationKey)}</span>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-4 text-xs text-ink-3">
        <span>{game.duelCount} {plural('games.duelsCount', game.duelCount)}</span>
      </div>
    </Link>
  );
}
