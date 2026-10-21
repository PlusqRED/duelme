'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { addedGame } from '@/lib/createSetup';
import { GAME_CATEGORIES, getCategoryLabelKey, type Game, type GameCategory } from '@/lib/game';
import { GAME_TONES } from '@/lib/gameTile';

interface AddGameFormProps {
  /** The games on offer, so a name the catalog already has picks that game rather than adding it twice. */
  games: readonly Game[];
  /** What was searched for, to start the name with. */
  initialName: string;
  onAdd: (game: Game) => void;
  onCancel: () => void;
}

/**
 * Adding a game the catalog lacks: its name and its category, after a reminder to look first. The
 * game is only on this page until the duel is created; the backend adds it to the catalog then.
 */
export function AddGameForm({ games, initialName, onAdd, onCancel }: AddGameFormProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<GameCategory | null>(null);
  const canAdd = name.trim() !== '' && category !== null;

  useEffect(() => {
    input.current?.focus();
  }, []);

  function add() {
    if (canAdd) onAdd(addedGame(games, name, category));
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 rounded-[18px] bg-canvas p-4">
      <p className="flex items-start gap-2 text-sm text-ink-2">
        <Icon name="alert" className="mt-px size-[18px] text-ink-3" />
        <span>{t('create.game.warning')}</span>
      </p>
      <label htmlFor={inputId} className="text-sm font-bold">
        {t('createGame.name')}
      </label>
      <Input
        ref={input}
        id={inputId}
        value={name}
        maxLength={50}
        autoComplete="off"
        placeholder={t('createGame.namePlaceholder')}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          add();
        }}
        className="h-[52px] font-semibold placeholder:font-medium focus:ring-0"
      />
      <fieldset className="mt-1 min-w-0">
        <legend className="mb-2 text-sm font-bold">{t('createGame.category')}</legend>
        <div className="flex flex-wrap gap-1.5">
          {GAME_CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={category === option}
              onClick={() => setCategory(option)}
              style={{ '--tile-ink': GAME_TONES[option].ink }}
              className="inline-flex min-h-11 cursor-pointer items-center gap-[7px] rounded-full border-[1.5px] border-line-strong bg-paper pr-3.5 pl-3 text-sm font-label transition-colors duration-200 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {/* The dot wears the colour the category's game tiles wear. */}
              <i aria-hidden="true" className="size-3 rounded-[4px] bg-(--tile-ink)" />
              {t(getCategoryLabelKey(option))}
            </button>
          ))}
        </div>
      </fieldset>
      <p aria-live="polite" className="min-h-[1.3em] text-note text-ink-3">
        {category ? '' : t('createGame.categoryRequired')}
      </p>
      <div className="flex flex-wrap gap-x-2.5 gap-y-2">
        <Button type="button" disabled={!canAdd} onClick={add}>
          <Icon name="plus" />
          {t('create.game.submit')}
        </Button>
        <Button type="button" variant="paper" onClick={onCancel}>
          {t('create.game.cancel')}
        </Button>
      </div>
    </div>
  );
}
