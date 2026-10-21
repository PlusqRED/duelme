import type { ComponentProps } from 'react';
import type { SeatSide } from '@/lib/duel';
import { cn } from '@/lib/utils';

/**
 * A stake's token in its seat's colour, or in the sun once it is the winner's, for one drawn outside
 * React too: a stake in flight.
 */
export function stakeClassName(side: SeatSide, isPrize = false): string {
  return cn(
    'grid place-items-center rounded-[9px] text-sm font-strong text-paper not-italic tabular-nums inset-shadow-stake transition-colors duration-500',
    isPrize ? 'bg-sun text-ink' : side === 'creator' ? 'bg-red' : 'bg-blue'
  );
}

type StakeProps = ComponentProps<'span'> & { side: SeatSide; isPrize?: boolean };

/** The money one player put into a duel, as a token in that seat's colour, or the sun's once won. */
export function Stake({ side, isPrize, className, ...props }: StakeProps) {
  return <span className={cn(stakeClassName(side, isPrize), className)} {...props} />;
}
