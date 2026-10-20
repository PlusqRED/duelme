'use client';

import Link from 'next/link';
import { GameTile } from '@/components/identity/GameTile';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { getCategoryLabelKey, type Game } from '@/lib/game';
import { gameInk } from '@/lib/gameTile';
import { formatCount } from '@/lib/utils';

interface CatalogGameProps {
  game: Game;
  /** Its duels against the most any game in the list has, from 0 to 1: how long its bar is. */
  share: number;
  /** Its place in the list, which staggers the bars as they grow. */
  index: number;
  /** The game played most of all, marked with the trophy. */
  isTop: boolean;
}

/**
 * A game of the catalog as a cartridge on the shelf: its tile, its name, its category in its own
 * ink and how many duels it has seen, with a bar of its share. Pointing at it lifts it on an edge
 * of that ink, the way a picked game stands out in the landing's list.
 */
export function CatalogGame({ game, share, index, isTop }: CatalogGameProps) {
  const { t, plural, language } = useTranslation();

  return (
    <Link
      href={`/games/${game.slug}`}
      style={{ '--tone': gameInk(game.category), '--share': share, '--i': index }}
      className="group/game relative grid h-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-3.5 rounded-tile border-[1.5px] border-line bg-paper p-4 transition-[border-color,box-shadow,translate] duration-200 ease-press hover:-translate-y-0.5 hover:border-(--tone) hover:shadow-[0_3px_0_var(--tone)] active:translate-y-0.5 active:shadow-none"
    >
      <GameTile
        name={game.name}
        category={game.category}
        className="size-14 rounded-2xl text-lg transition-[scale,rotate] duration-300 ease-spring group-hover/game:scale-106 group-hover/game:-rotate-3"
      />
      <span className="grid min-w-0 justify-items-start gap-1">
        <span className="text-lg leading-tight font-strong hyphens-auto [overflow-wrap:anywhere]">{game.name}</span>
        <span className="text-note font-label text-(--tone)">{t(getCategoryLabelKey(game.category))}</span>
      </span>
      {/* A ribbon on the card's top edge, so the top game keeps its category like the rest. */}
      {isTop && (
        <Chip className="absolute -top-3 right-3.5 h-6 bg-sun pr-2.5 pl-2 text-xs font-strong text-ink shadow-[0_2px_0_var(--color-sun-edge)]">
          <Icon name="trophy" className="size-3.5" />
          {t('games.mostPlayed')}
        </Chip>
      )}
      <span className="grid justify-items-end text-right">
        <b className="text-lead font-extrabold tabular-nums">{formatCount(game.duelCount, language)}</b>
        <span className="text-note text-ink-3">{plural('games.duelsCount', game.duelCount)}</span>
      </span>
      <span aria-hidden="true" className="col-span-full h-1.5 overflow-hidden rounded-md bg-canvas">
        <i className="block h-full w-[calc(var(--share)*100%)] origin-left rounded-[inherit] bg-(--tone) transition-[scale] delay-[calc(min(var(--i),8)*90ms)] duration-900 ease-sheet group-data-pending/catalog:scale-x-0" />
      </span>
    </Link>
  );
}
