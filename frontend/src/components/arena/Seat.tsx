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
  /** The share of a real duel's time to answer still left, from 0 to 1, for the ring to measure. */
  timerLeft?: number;
  isWinner: boolean;
  /** The name, or a link to the player's profile carrying it. */
  name: ReactNode;
  /** Nobody sits here yet: the name is the invitation, in the opponent's blue. */
  isOpen: boolean;
  /** The reader sits here: the name, "You", is set in navy. */
  isYou?: boolean;
  /** A small copy of the table, one of several on a page: the name in small type. */
  isCompact?: boolean;
  /** The reader's own seat while they are not signed in: the name is in their red. */
  isYoursEmpty?: boolean;
  /** Under the name: the player's money and what the duel added to their record. */
  children: ReactNode;
}

/**
 * One side of the table: a player's face with what they say above it, their clock around it and a
 * trophy once they win, then their name and whatever the screen shows under it. Its stage gives the
 * avatar's size as `--av` and the safe's height as `--box`, so the face sits level with the safe.
 */
export function Seat({ face, above, timer, timerLeft, isWinner, name, isOpen, isYou = false, isCompact = false, isYoursEmpty = false, children }: SeatProps) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 pt-[calc((var(--box)-var(--av))/2)] text-center">
      <div className="relative mb-1 size-(--av)">
        {above}
        <CountdownRing timer={timer} left={timerLeft} />
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
      <p
        className={cn(
          'text-body-sm/[1.2] font-bold max-xs:text-note/[1.2]',
          isCompact && 'text-note/[1.2]',
          isOpen && (isYoursEmpty ? 'text-red-deep' : 'text-blue-deep'),
          isYou && 'rounded-full bg-ink px-2.5 py-0.5 text-paper'
        )}
      >
        {name}
      </p>
      {children}
    </div>
  );
}
