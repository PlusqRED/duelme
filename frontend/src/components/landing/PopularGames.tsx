'use client';

import { useId, useRef } from 'react';
import { GameTile } from '@/components/identity/GameTile';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import { useTranslation } from '@/i18n/useTranslation';
import { getCategoryLabelKey, type Game } from '@/lib/game';
import { gameInk } from '@/lib/gameTile';

interface PopularGamesProps {
  /** The games with the most duels, most first. */
  games: Game[];
  isLoading: boolean;
  /** The slug of the game the recent duels are filtered to, or null for every game. */
  picked: string | null;
  onPick: (slug: string) => void;
  className?: string;
}

/**
 * The games players wager on most, each with a bar of its share of the duels that grows the first
 * time the list is seen. Each one is also a filter for the recent duels beside it: picked, it takes
 * its own ink and the others step back.
 */
export function PopularGames({ games, isLoading, picked, onPick, className }: PopularGamesProps) {
  const { t, plural } = useTranslation();
  const titleId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const isSeen = useSeenOnce(listRef, 0.6);
  const most = games[0]?.duelCount ?? 1;

  return (
    <section aria-labelledby={titleId} className={className}>
      <h3 id={titleId} className="text-2xl">
        {t('popularGames.title')}
      </h3>
      <p className="mt-1.5 text-ink-2">{t('popularGames.subtitle')}</p>
      {games.length > 0 && <p className="mt-1 text-sm text-ink-3">{t('popularGames.hint')}</p>}
      <ol
        ref={listRef}
        aria-label={t('popularGames.filterLabel')}
        data-pending={isSeen ? undefined : ''}
        className="group/games mt-4 mb-2 grid gap-2.5 max-wide:swipe-strip max-wide:pt-0.5 max-wide:pb-2"
      >
        {isLoading &&
          [0, 1, 2].map((index) => (
            <li key={index} aria-hidden="true" className="h-[74px] animate-pulse rounded-tile bg-paper max-wide:basis-[min(240px,72%)]" />
          ))}
        {games.map((game, index) => (
          <li key={game.slug} className="max-wide:basis-[min(240px,72%)]">
            <button
              type="button"
              aria-pressed={picked === game.slug}
              data-dimmed={picked !== null && picked !== game.slug ? '' : undefined}
              onClick={() => onPick(game.slug)}
              style={{ '--tone': gameInk(game.category), '--share': game.duelCount / most, '--i': index }}
              className="group/game grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-tile border-[1.5px] border-line bg-paper pt-3 pr-3.5 pb-3.5 pl-3 text-left transition-[border-color,box-shadow,opacity,translate] duration-200 ease-press hover:border-line-strong active:translate-y-0.5 aria-pressed:border-(--tone) aria-pressed:shadow-[0_3px_0_var(--tone)] data-dimmed:opacity-55 data-dimmed:hover:opacity-100"
            >
              <GameTile
                name={game.name}
                category={game.category}
                className="row-span-2 transition-[scale,background-color,color] duration-300 ease-spring group-hover/game:scale-106 group-aria-pressed/game:bg-(--tone) group-aria-pressed/game:text-paper"
              />
              {/* A swiped card is narrow: the name takes the whole line and the count sits by the bar. */}
              <span className="grid min-w-0 max-wide:col-span-2">
                <span className="font-strong hyphens-auto [overflow-wrap:anywhere]">{game.name}</span>
                <span className="text-note text-ink-3">{t(getCategoryLabelKey(game.category))}</span>
              </span>
              <span className="text-sm font-label whitespace-nowrap text-ink-2 max-wide:col-start-3 max-wide:row-start-2">
                {game.duelCount} {plural('games.duelsCount', game.duelCount)}
              </span>
              <span
                aria-hidden="true"
                className="col-[2/-1] h-1.5 overflow-hidden rounded-md bg-canvas max-wide:col-[2/3] max-wide:row-start-2"
              >
                <i className="block h-full w-[calc(var(--share)*100%)] origin-left rounded-[inherit] bg-(--tone) transition-[scale] delay-[calc(var(--i)*110ms)] duration-900 ease-sheet group-data-pending/games:scale-x-0" />
              </span>
            </button>
          </li>
        ))}
      </ol>
      {!isLoading && games.length === 0 && <p className="mb-2 text-ink-2">{t('popularGames.empty')}</p>}
      <LocaleLink href="/games" className="link inline-flex min-h-11 items-center">
        {t('popularGames.viewAll')}
      </LocaleLink>
    </section>
  );
}
