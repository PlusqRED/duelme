import type { ReactNode } from 'react';
import { CountdownRing } from '@/components/arena/CountdownRing';
import { Icon } from '@/components/ui/icon';
import type { CountdownTimer } from '@/lib/duel';
import { cn } from '@/lib/utils';

interface SeatProps {
  /** The player's face: their avatar, or an open seat. */
  face: ReactNode;
  /** What sits above the face: the player speaking, or their clock. */
  above?: ReactNode;
  timer: CountdownTimer;
  isWinner: boolean;
  name: string;
  /** Nobody sits here yet: the name is the invitation, in the opponent's blue. */
  isOpen: boolean;
  /** Under the name: the player's money and what the duel added to their record. */
  children: ReactNode;
}

/**
 * One side of the table: a player's face with what they say above it, their clock around it and a
 * trophy once they win, then their name and whatever the screen shows under it. Its stage gives the
 * avatar's size as `--av` and the safe's height as `--box`, so the face sits level with the safe.
 */
export function Seat({ face, above, timer, isWinner, name, isOpen, children }: SeatProps) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 pt-[calc((var(--box)-var(--av))/2)] text-center">
      <div className="relative mb-1 size-(--av)">
        {above}
        <CountdownRing timer={timer} />
        {face}
        <span
          aria-hidden="true"
          className={cn(
            'absolute -right-1.5 -bottom-1 grid size-8 scale-0 place-items-center rounded-full border-3 border-paper bg-sun text-ink transition-[scale] duration-450 ease-spring',
            isWinner && 'scale-100'
          )}
        >
          <Icon name="trophy" className="size-4" />
        </span>
      </div>
      <p className={cn('text-body-sm/[1.2] font-bold max-xs:text-note/[1.2]', isOpen && 'text-blue-deep')}>{name}</p>
      {children}
    </div>
  );
}
