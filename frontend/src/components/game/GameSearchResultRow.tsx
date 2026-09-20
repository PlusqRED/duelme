'use client';

import { Gamepad2 } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import type { Game } from '@/lib/game';
import { buildHighlightSet } from '@/lib/gameSearch';

interface GameSearchResultRowProps {
  game: Game;
  matchIndices: ReadonlyArray<readonly [number, number]>;
  isSelected: boolean;
  onSelect: () => void;
}

export function GameSearchResultRow({
  game,
  matchIndices,
  isSelected,
  onSelect,
}: GameSearchResultRowProps) {
  const { t, plural } = useTranslation();
  const highlights = buildHighlightSet(matchIndices);
  const characters = Array.from(game.name);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-all min-h-11 ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50/60'
          : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Gamepad2 className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">
          {characters.map((ch, idx) =>
            highlights.has(idx) ? (
              <mark key={idx} className="rounded bg-indigo-100 text-indigo-700">
                {ch}
              </mark>
            ) : (
              <span key={idx}>{ch}</span>
            )
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          <span>{t(`category.${game.category}` as TranslationKey)}</span>
          <span>·</span>
          <span>
            {game.duelCount} {plural('games.duelsCount', game.duelCount)}
          </span>
        </div>
      </div>
    </button>
  );
}
