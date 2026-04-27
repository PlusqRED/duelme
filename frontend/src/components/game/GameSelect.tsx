'use client';

import { ChevronDown, Gamepad2 } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import type { Game } from '@/lib/game';

interface GameSelectProps {
  games: Game[];
  selectedSlug: string;
  onSelect: (game: Game) => void;
  label: string;
  placeholder: string;
}

export function GameSelect({
  games,
  selectedSlug,
  onSelect,
  label,
  placeholder,
}: GameSelectProps) {
  const { t } = useTranslation();
  const selectedGame = games.find((game) => game.slug === selectedSlug) ?? null;

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = games.find((game) => game.slug === event.target.value);
    if (next) onSelect(next);
  }

  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div
        className={`relative flex items-center rounded-xl border-2 bg-white transition-colors ${
          selectedGame
            ? 'border-indigo-300 bg-indigo-50/40'
            : 'border-slate-200 hover:border-indigo-200'
        }`}
      >
        <Gamepad2
          className={`pointer-events-none ml-3 h-4 w-4 shrink-0 ${
            selectedGame ? 'text-indigo-500' : 'text-slate-400'
          }`}
        />
        <select
          value={selectedGame ? selectedGame.slug : ''}
          onChange={handleChange}
          className="h-11 w-full min-w-0 cursor-pointer appearance-none bg-transparent pl-2 pr-9 text-sm font-semibold text-slate-900 outline-none"
        >
          <option value="" hidden disabled>
            {placeholder}
          </option>
          {games.map((game) => (
            <option key={game.slug} value={game.slug}>
              {game.name} · {t(`category.${game.category}` as TranslationKey)}
            </option>
          ))}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute right-3 h-4 w-4 ${
            selectedGame ? 'text-indigo-500' : 'text-slate-400'
          }`}
        />
      </div>
    </label>
  );
}
