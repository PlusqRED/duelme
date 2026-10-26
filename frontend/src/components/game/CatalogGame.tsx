'use client';

import { GameTile } from '@/components/identity/GameTile';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { useTranslation } from '@/i18n/useTranslation';
import type { Game } from '@/lib/game';
import { gameInk } from '@/lib/gameTile';
import { formatCount } from '@/lib/utils';

interface CatalogGameProps {
  game: Game;
  /** Its duels against the most any game on the page has, from 0 to 1: how long its bar is. */
  share: number;
  /** Its place on its shelf, which staggers the bars as they grow. */
  index: number;
  /** The game played most of all, marked with the trophy. */
  isTop: boolean;
}

/**
 * A game of the catalog as a cartridge on its category's shelf: its tile and its name (under the
 * tile on a phone, where two cards share a row; beside it from `xs`), and once someone has duelled
 * in it, how many duels with a bar of its share, so the games people play stand out from the quiet
 * ones. Pointing at it lifts it on an edge of its category's ink.
 */
export function CatalogGame({ game, share, index, isTop }: CatalogGameProps) {
  const { t, plural, language } = useTranslation();
  const isPlayed = game.duelCount > 0;

  return (
    <LocaleLink
      href={`/games/${game.slug}`}
      style={{ '--tone': gameInk(game.category), '--share': share, '--i': index }}
      className="group/game relative flex h-full flex-col items-start gap-2.5 rounded-tile border-[1.5px] border-line bg-paper p-3 transition-[border-color,box-shadow,translate] duration-200 ease-press hover:-translate-y-0.5 hover:border-(--tone) hover:shadow-[0_3px_0_var(--tone)] active:translate-y-0.5 active:shadow-none xs:grid xs:grid-cols-[auto_minmax(0,1fr)] xs:items-center xs:gap-x-3.5 xs:gap-y-3 xs:p-3.5"
    >
      <GameTile
        name={game.name}
        category={game.category}
        className="size-10 rounded-xl text-xs transition-[scale,rotate] duration-300 ease-spring group-hover/game:scale-106 group-hover/game:-rotate-3 xs:size-12 xs:rounded-[14px] xs:text-sm"
      />
      <span className="grid w-full min-w-0 justify-items-start">
        <span className="text-body-sm/tight font-strong hyphens-auto [overflow-wrap:anywhere] xs:text-body/tight">{game.name}</span>
        {isPlayed && (
          <span className="mt-1 text-note text-ink-3">
            <b className="font-strong text-ink tabular-nums">{formatCount(game.duelCount, language)}</b>{' '}
            {plural('games.duelsCount', game.duelCount)}
          </span>
        )}
      </span>
      {/* A ribbon on the card's top edge, so the top game keeps its name in view like the rest. */}
      {isTop && (
        <Chip className="absolute -top-3 right-3 h-6 bg-sun pr-2.5 pl-2 text-xs font-strong text-ink shadow-[0_2px_0_var(--color-sun-edge)]">
          <Icon name="trophy" className="size-3.5" />
          {/* A phone's card is narrower than the words: the cup says it there, the words to a reader. */}
          <span className="max-xs:sr-only">{t('games.mostPlayed')}</span>
        </Chip>
      )}
      {isPlayed && (
        <span aria-hidden="true" className="mt-auto h-1.5 w-full overflow-hidden rounded-md bg-canvas xs:col-span-full xs:mt-0">
          <i className="block h-full w-[calc(var(--share)*100%)] origin-left rounded-[inherit] bg-(--tone) transition-[scale] delay-[calc(min(var(--i),8)*90ms)] duration-900 ease-sheet group-data-pending/shelf:scale-x-0" />
        </span>
      )}
    </LocaleLink>
  );
}
