'use client';

import { GameTile } from '@/components/identity/GameTile';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import type { Game } from '@/lib/game';

interface PickedGameChipProps {
  /** The game a list of duels is narrowed to, or null for every game. */
  game: Game | undefined;
  onClear: () => void;
}

/**
 * Which game a list of duels shows, as a chip that pops in when a game is picked and shows every
 * game again when pressed. The region it sits in reads the change out.
 */
export function PickedGameChip({ game, onClear }: PickedGameChipProps) {
  const { t } = useTranslation();

  return (
    <div aria-live="polite">
      {game && (
        <button
          key={game.slug}
          type="button"
          onClick={onClear}
          className="group/chip mb-3 inline-flex min-h-11 animate-pop cursor-pointer items-center gap-2.5 rounded-full border-[1.5px] border-ink bg-paper py-1 pr-3.5 pl-1 text-body-sm font-bold"
        >
          <GameTile name={game.name} category={game.category} className="size-[34px] rounded-full text-xs" />
          {t('recent.only', { game: game.name })}
          <span className="sr-only">{t('recent.showAll')}</span>
          <Icon
            name="x"
            className="size-4 text-ink-3 transition-[color,rotate] duration-300 ease-spring group-hover/chip:rotate-90 group-hover/chip:text-ink"
          />
        </button>
      )}
    </div>
  );
}
