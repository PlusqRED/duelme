'use client';

import { GameTile } from '@/components/identity/GameTile';
import { Fact } from '@/components/landing/HeroFacts';
import { Chip } from '@/components/ui/chip';
import { useTranslation } from '@/i18n/useTranslation';
import { getCategoryLabelKey, type Game } from '@/lib/game';
import { gameInk } from '@/lib/gameTile';
import { formatCount, formatVolume } from '@/lib/utils';

interface GameHeadProps {
  game: Game;
  /** Both stakes of every duel someone joined in it, in USDT's base units. */
  totalVolume: bigint;
  duelsPlayed: number;
  /** The game's duels are still being read, or could not all be: the figures show a dash. */
  isUnknown: boolean;
}

/**
 * A game's page head: its tile grown into a keycap tilted on an edge of its category's ink, its
 * name and category, and the money and duels it has seen.
 */
export function GameHead({ game, totalVolume, duelsPlayed, isUnknown }: GameHeadProps) {
  const { t, plural, language } = useTranslation();

  return (
    <header
      style={{ '--tone': gameInk(game.category) }}
      className="mb-[clamp(36px,5vw,56px)] grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-[clamp(16px,2.4vw,28px)] gap-y-5"
    >
      <GameTile
        name={game.name}
        category={game.category}
        className="size-[clamp(72px,9vw,96px)] animate-rise rounded-[clamp(20px,2.6vw,28px)] text-[clamp(1.5rem,1rem+1.6vw,2.1rem)] shadow-[0_5px_0_var(--tone)] -rotate-3"
      />
      <div className="grid min-w-0 justify-items-start gap-2.5">
        <h1 className="text-h1 hyphens-auto [overflow-wrap:anywhere]">{game.name}</h1>
        <Chip className="h-7 gap-2 bg-paper px-3 text-sm text-ink before:size-2 before:rounded-full before:bg-(--tone)">
          {t(getCategoryLabelKey(game.category))}
        </Chip>
      </div>
      <dl className="col-span-full flex flex-wrap gap-x-7 gap-y-2 border-t border-line pt-5 text-body-sm">
        <Fact value={isUnknown ? '—' : `${formatVolume(totalVolume, language)} USDT`} label={t('hero.totalVolume')} />
        <Fact value={isUnknown ? '—' : formatCount(duelsPlayed, language)} label={plural('hero.duelsPlayed', duelsPlayed)} />
      </dl>
    </header>
  );
}
