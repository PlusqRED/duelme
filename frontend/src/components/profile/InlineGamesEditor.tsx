'use client';

import { motion } from 'framer-motion';
import { Pencil, X, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROFILE_LIMITS } from '@/lib/profile';
import { useTranslation } from '@/i18n/useTranslation';

interface InlineGamesEditorProps {
  games: string[];
  onSave: (next: string[]) => Promise<void>;
  isSaving?: boolean;
}

export function InlineGamesEditor({ games, onSave, isSaving }: InlineGamesEditorProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(games);
  const [input, setInput] = useState('');

  function startEdit() {
    setDraft(games);
    setInput('');
    setEditing(true);
  }

  function add() {
    const tag = input.trim();
    if (!tag || tag.length > PROFILE_LIMITS.gameTag) return;
    if (draft.length >= PROFILE_LIMITS.gamesMax || draft.includes(tag)) return;
    setDraft([...draft, tag]);
    setInput('');
  }

  async function commit() {
    const pending = input.trim();
    const next =
      pending && pending.length <= PROFILE_LIMITS.gameTag && !draft.includes(pending)
        ? [...draft, pending]
        : draft;
    await onSave(next);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {t('profile.games')}
        </span>
        {!editing && (
          <button
            onClick={startEdit}
            aria-label="Edit games"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 min-h-[44px] min-w-[44px]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {draft.map((g) => (
              <motion.span
                key={g}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
              >
                {g}
                <button
                  onClick={() => setDraft(draft.filter((x) => x !== g))}
                  className="ml-0.5 text-indigo-400 hover:text-indigo-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('profile.gamesPlaceholder')}
              maxLength={PROFILE_LIMITS.gameTag}
              className="h-9 flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={add}
              disabled={!input.trim()}
              className="min-h-[44px] min-w-[44px]"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={isSaving}
              className="min-h-[44px]"
            >
              {t('profile.cancel')}
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 text-white hover:bg-indigo-700 min-h-[44px]"
              onClick={() => void commit()}
              disabled={isSaving}
            >
              {isSaving ? t('profile.saving') : t('profile.save')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {games.length > 0 ? (
            games.map((g) => (
              <span
                key={g}
                className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
              >
                {g}
              </span>
            ))
          ) : (
            <span className="text-sm italic text-slate-400">{t('profile.gamesPlaceholder')}</span>
          )}
        </div>
      )}
    </div>
  );
}
