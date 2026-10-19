import type { GameCategory } from '@/lib/game';
import { gameInitials } from '@/lib/gameTile';
import { cn } from '@/lib/utils';

const tones: Record<GameCategory, string> = {
  FPS: 'bg-game-fps text-game-fps-ink',
  MOBA: 'bg-game-moba text-game-moba-ink',
  SPORT: 'bg-game-sport text-game-sport-ink',
  STRATEGY: 'bg-game-strategy text-game-strategy-ink',
  FIGHTING: 'bg-game-fighting text-game-fighting-ink',
  RACING: 'bg-game-racing text-game-racing-ink',
  CARD: 'bg-game-card text-game-card-ink',
  OTHER: 'bg-game-other text-game-other-ink',
};

interface GameTileProps {
  name: string;
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
        category ? tones[category] : 'bg-canvas-deep text-ink',
        className
      )}
    >
      {gameInitials(name)}
    </span>
  );
}
