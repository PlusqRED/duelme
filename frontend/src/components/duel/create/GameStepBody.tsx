'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AddGameForm } from '@/components/duel/create/AddGameForm';
import { StepLead } from '@/components/duel/create/SetupStep';
import { GameTile } from '@/components/identity/GameTile';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { isNewGame } from '@/lib/createSetup';
import { getCategoryLabelKey, type Game } from '@/lib/game';
import { GAME_TONES } from '@/lib/gameTile';
import { createGameSearcher, gamesOnOffer, highlightRuns, type GameSearchResult } from '@/lib/gameSearch';
import { cn } from '@/lib/utils';

/** How many of the most played games show before anything is searched. */
const POPULAR = 6;

/** The quiet link under the games: an underlined line in the opponent's deep blue. */
const moreLinkClassName =
  'inline-flex min-h-11 cursor-pointer items-center justify-self-start text-body-sm font-label text-blue-deep underline decoration-blue-deep/30 decoration-2 underline-offset-[5px] transition-[text-decoration-color] duration-200 hover:decoration-current';

interface GameStepBodyProps {
  catalog: readonly Game[];
  picked: Game | null;
  isOpen: boolean;
  onPick: (game: Game) => void;
}

/**
 * The game step: a search over the catalog, the most played games before anything is typed, and a
 * way to add a game the catalog lacks, after a reminder to look first. Enter picks the one game
 * left. Closed, the step forgets its search, so it opens on the catalog again.
 */
export function GameStepBody({ catalog, picked, isOpen, onPick }: GameStepBodyProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState<readonly Game[]>([]);
  const addLink = useRef<HTMLButtonElement>(null);
  const isBackFromAdding = useRef(false);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setQuery('');
  }

  const games = useMemo(() => [...catalog, ...added], [catalog, added]);
  const searcher = useMemo(() => createGameSearcher(games), [games]);
  const trimmed = query.trim();
  const shown: GameSearchResult[] = trimmed
    ? searcher.search(trimmed)
    : gamesOnOffer(games, picked, POPULAR).map((game) => ({ game, matchIndices: [] }));
  const isEmpty = trimmed !== '' && shown.length === 0;

  useEffect(() => {
    // Cancelled: the focus goes back to the link that opened the form.
    if (isAdding || !isBackFromAdding.current) return;
    isBackFromAdding.current = false;
    addLink.current?.focus();
  }, [isAdding]);

  function cancelAdding() {
    isBackFromAdding.current = true;
    setIsAdding(false);
  }

  function search(text: string) {
    setQuery(text);
    // Typing again goes back to looking: the form opened for the last search closes.
    if (isAdding && text.trim()) setIsAdding(false);
  }

  function pressKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (trimmed && shown.length === 1) onPick(shown[0].game);
  }

  function addPicked(game: Game) {
    if (isNewGame(game) && !games.some((known) => known.slug === game.slug)) setAdded((list) => [...list, game]);
    setIsAdding(false);
    setQuery('');
    onPick(game);
  }

  return (
    <>
      <StepLead>{t('create.game.lead')}</StepLead>
      <label className="relative block">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-[15px] size-5 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          data-first
          value={query}
          maxLength={50}
          autoComplete="off"
          placeholder={t('create.game.search')}
          aria-label={t('create.game.search')}
          onChange={(event) => search(event.target.value)}
          onKeyDown={pressKey}
          className="min-h-[52px] w-full rounded-2xl border-[1.5px] border-line-strong bg-paper pr-4 pl-[46px] text-base font-semibold text-ink transition-[border-color] duration-200 outline-none placeholder:font-medium placeholder:text-ink-3 focus:border-ink"
        />
      </label>
      {shown.length > 0 && (
        <div className="mt-4 mb-2 grid grid-cols-[repeat(auto-fill,minmax(min(100%,168px),1fr))] gap-2">
          {shown.map(({ game, matchIndices }) => (
            <GameButton key={game.slug} game={game} matchIndices={matchIndices} isPicked={picked?.slug === game.slug} onPick={onPick} />
          ))}
        </div>
      )}
      {isEmpty && !isAdding && (
        <div className="grid justify-items-start gap-2.5 rounded-2xl border-[1.5px] border-dashed border-line-strong px-4 py-3.5 text-ink-2">
          <p>{t('gamePicker.noMatches', { query: trimmed })}</p>
          <Button type="button" variant="paper" size="sm" onClick={() => setIsAdding(true)}>
            <Icon name="plus" />
            {t('create.game.addNamed', { query: trimmed })}
          </Button>
        </div>
      )}
      {!isEmpty && !isAdding && (
        <button ref={addLink} type="button" onClick={() => setIsAdding(true)} className={cn(moreLinkClassName, '-mt-1.5')}>
          {t('create.game.add')}
        </button>
      )}
      {isAdding && <AddGameForm games={games} initialName={trimmed} onAdd={addPicked} onCancel={cancelAdding} />}
    </>
  );
}

interface GameButtonProps {
  game: Game;
  matchIndices: GameSearchResult['matchIndices'];
  isPicked: boolean;
  onPick: (game: Game) => void;
}

/** A game to pick: its tile, its name with what the search matched marked, and its category and duels. */
function GameButton({ game, matchIndices, isPicked, onPick }: GameButtonProps) {
  const { t, plural } = useTranslation();
  const detail = isNewGame(game) ? t('create.game.added') : `${game.duelCount} ${plural('games.duelsCount', game.duelCount)}`;

  return (
    <button
      type="button"
      aria-pressed={isPicked}
      onClick={() => onPick(game)}
      // A category the backend has and this list does not yet picks in navy.
      style={{ '--tile-ink': GAME_TONES[game.category]?.ink ?? 'var(--color-ink)' }}
      className={cn(
        'group/game relative flex min-h-16 cursor-pointer items-center gap-2.5 rounded-2xl border-[1.5px] border-line bg-paper py-[9px] pr-3 pl-2.5 text-left transition-[border-color,box-shadow,translate] duration-200 hover:border-line-strong active:translate-y-0.5',
        'aria-pressed:border-ink aria-pressed:shadow-[0_3px_0_var(--color-ink)]'
      )}
    >
      <GameTile
        name={game.name}
        category={game.category}
        className="transition-[scale,background-color,color] duration-300 ease-spring group-hover/game:scale-106 group-aria-pressed/game:bg-(--tile-ink) group-aria-pressed/game:text-paper"
      />
      <span className="grid min-w-0 flex-1">
        <strong className="line-clamp-2 text-base/[1.25] font-strong [overflow-wrap:anywhere]">
          {highlightRuns(game.name, matchIndices).map((run, index) =>
            run.isMatch ? (
              <mark key={index} className="rounded-[4px] bg-canvas-deep text-inherit">
                {run.text}
              </mark>
            ) : (
              run.text
            )
          )}
        </strong>
        <small className="truncate text-note text-ink-3">
          {t(getCategoryLabelKey(game.category))}, {detail}
        </small>
      </span>
      <span className="grid size-6 flex-none scale-50 place-items-center rounded-full bg-ink text-paper opacity-0 transition-[opacity,scale] duration-350 ease-spring group-aria-pressed/game:scale-100 group-aria-pressed/game:opacity-100">
        <Icon name="check" className="size-3.5 stroke-3" />
      </span>
    </button>
  );
}
