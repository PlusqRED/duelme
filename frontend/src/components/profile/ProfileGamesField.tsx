'use client';

import { useId, useState } from 'react';
import { GameChip } from '@/components/profile/GameChip';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/i18n/useTranslation';
import { PROFILE_LIMITS } from '@/lib/profile';
import { gameTagProblem, withGameTag } from '@/lib/profileEdit';

interface ProfileGamesFieldProps {
  games: readonly string[];
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  /** Saves the list; resolves once the profile has it, or has refused it. */
  onSave: (games: string[]) => Promise<void>;
}

/**
 * The games the owner says they play, as chips: a pen opens the list to take games off and type
 * new ones in, and a game still in the box when they save goes in with the rest.
 */
export function ProfileGamesField({ games, isEditing, isSaving, onEdit, onCancel, onSave }: ProfileGamesFieldProps) {
  const { t } = useTranslation();
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className="grid gap-2 py-3 not-first:border-t not-first:border-line">
      <div className="flex items-center justify-between gap-3">
        <span id={labelId} className="text-body-sm font-label text-ink-2">
          {t('profile.games')}
        </span>
        {!isEditing && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('profile.editField', { field: t('profile.games') })}
            className="-my-2 grid size-11 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors hover:bg-canvas hover:text-ink"
          >
            <Icon name="pen" className="size-[18px]" />
          </button>
        )}
      </div>
      {isEditing ? (
        <GamesEditor games={games} isSaving={isSaving} onCancel={onCancel} onSave={onSave} />
      ) : games.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {games.map((game) => (
            <GameChip key={game} game={game} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-3">{t('profile.gamesPlaceholder')}</p>
      )}
    </div>
  );
}

type GamesEditorProps = Pick<ProfileGamesFieldProps, 'games' | 'isSaving' | 'onCancel' | 'onSave'>;

function GamesEditor({ games, isSaving, onCancel, onSave }: GamesEditorProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string[]>([...games]);
  const [typed, setTyped] = useState('');
  const canAdd = gameTagProblem(draft, typed) === null;

  function add() {
    if (!canAdd) return;
    setDraft(withGameTag(draft, typed));
    setTyped('');
  }

  return (
    <>
      {draft.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {draft.map((game) => (
            <GameChip key={game} game={game} onRemove={() => setDraft(draft.filter((entry) => entry !== game))} />
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onCancel();
            }
          }}
          placeholder={t('profile.gamesPlaceholder')}
          aria-label={t('profile.addGame')}
          maxLength={PROFILE_LIMITS.gameTag}
          disabled={draft.length >= PROFILE_LIMITS.gamesMax}
        />
        <Button variant="paper" onClick={add} disabled={!canAdd} aria-label={t('profile.addGame')} className="w-12 px-0">
          <Icon name="plus" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          {t('profile.cancel')}
        </Button>
        <Button size="sm" onClick={() => void onSave(withGameTag(draft, typed))} disabled={isSaving} aria-busy={isSaving}>
          {isSaving && <Spinner />}
          {t(isSaving ? 'profile.saving' : 'profile.save')}
        </Button>
      </div>
    </>
  );
}
