import type { ComponentProps } from 'react';
import type { SeatSide } from '@/lib/duel';
import { cn } from '@/lib/utils';

/** A stake's token in its seat's colour, for one drawn outside React: a stake in flight. */
export function stakeClassName(side: SeatSide): string {
  return cn(
    'grid place-items-center rounded-[9px] text-sm font-strong text-paper not-italic tabular-nums inset-shadow-stake',
    side === 'creator' ? 'bg-red' : 'bg-blue'
  );
}

type StakeProps = ComponentProps<'span'> & { side: SeatSide };

/** The money one player put into a duel, as a token in that seat's colour. */
export function Stake({ side, className, ...props }: StakeProps) {
  return <span className={cn(stakeClassName(side), className)} {...props} />;
}
