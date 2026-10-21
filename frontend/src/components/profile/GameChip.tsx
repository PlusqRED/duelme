'use client';

import { GameTile } from '@/components/identity/GameTile';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';

interface GameChipProps {
  /** As the player wrote it: it names a game, it is not a game of the catalog. */
  game: string;
  /** While the list is being edited: the way to take it off. */
  onRemove?: () => void;
}

/** A game a player says they play, its initials on a neutral tile beside its name. */
export function GameChip({ game, onRemove }: GameChipProps) {
  const { t } = useTranslation();

  return (
    <li className="inline-flex max-w-full items-center gap-2 rounded-full border-[1.5px] border-line bg-paper py-1 pr-3.5 pl-1 font-label data-removable:animate-pop data-removable:pr-1" data-removable={onRemove ? '' : undefined}>
      <GameTile name={game} className="size-8 rounded-full text-micro" />
      <span className="min-w-0 truncate">{game}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('profile.removeGame', { game })}
          className="-my-1.5 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors hover:bg-canvas hover:text-ink"
        >
          <Icon name="x" className="size-4" />
        </button>
      )}
    </li>
  );
}
