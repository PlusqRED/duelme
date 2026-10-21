import { Icon } from '@/components/ui/icon';
import type { GameCategory } from '@/lib/game';
import { GAME_TONES, gameInitials } from '@/lib/gameTile';
import { cn } from '@/lib/utils';

interface GameTileProps {
  /** Null for a duel created without a game: a gamepad stands in for the initials. */
  name: string | null;
  /** Without one the tile stays neutral. */
  category?: GameCategory | null;
  className?: string;
}

/** A game's initials on its category's colour. The name sits beside it, so the tile is not read out. */
export function GameTile({ name, category, className }: GameTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-[13px] text-sm font-extrabold tracking-[-0.02em]',
        // A category the backend has and this list does not yet stays neutral too.
        (category && GAME_TONES[category]?.tile) || 'bg-canvas-deep text-ink',
        className
      )}
    >
      {name === null ? <Icon name="gamepad" className="size-[45%]" /> : gameInitials(name)}
    </span>
  );
}
