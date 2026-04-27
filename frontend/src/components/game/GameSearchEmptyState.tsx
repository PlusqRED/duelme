'use client';

import { SearchX } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface GameSearchEmptyStateProps {
  query: string;
  onCreateClick: () => void;
}

export function GameSearchEmptyState({ query, onCreateClick }: GameSearchEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <SearchX className="h-8 w-8 text-slate-300" />
      <div>
        <p className="text-sm font-medium text-slate-700">
          {t('gamePicker.noMatches', { query })}
        </p>
        <p className="mt-1 text-xs text-slate-500">{t('gamePicker.noMatchesHint')}</p>
      </div>
      <button
        type="button"
        onClick={onCreateClick}
        className="mt-1 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
      >
        {t('gamePicker.createNewWith', { query })}
      </button>
    </div>
  );
}
