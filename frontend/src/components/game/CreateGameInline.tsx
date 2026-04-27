'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import { useIdentityToken } from '@privy-io/react-auth';
import { Input } from '@/components/ui/input';
import { useAppToast } from '@/hooks/useAppToast';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { GAME_CATEGORIES, type Game, type GameCategory } from '@/lib/game';
import { createGame } from '@/lib/gameApi';

interface CreateGameInlineProps {
  initialName: string;
  onCreated: (game: Game) => void;
}

export function CreateGameInline({ initialName, onCreated }: CreateGameInlineProps) {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const { identityToken } = useIdentityToken();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<GameCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 1 && trimmed.length <= 50 && category !== null && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit || category === null) return;
    if (!identityToken) {
      appToast.error('toast.walletNotReady');
      return;
    }
    setIsSubmitting(true);
    try {
      const game = await createGame(identityToken, trimmed, category);
      onCreated(game);
    } catch {
      appToast.error('createGame.failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-800">{t('createGame.warning')}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="new-game-name" className="text-xs font-semibold text-slate-700">
          {t('createGame.name')}
        </label>
        <Input
          id="new-game-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={50}
          placeholder={t('createGame.namePlaceholder')}
          className="h-11 border-slate-200"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-700">
          {t('createGame.category')}
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GAME_CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`min-h-11 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/30'
                }`}
              >
                {t(`category.${cat}` as TranslationKey)}
              </button>
            );
          })}
        </div>
        {category === null && (
          <p className="text-xs text-slate-500">{t('createGame.categoryRequired')}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {t('createGame.submit')}
      </button>
    </div>
  );
}
