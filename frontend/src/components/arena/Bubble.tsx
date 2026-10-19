import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import type { SeatSide } from '@/lib/duel';
import { cn } from '@/lib/utils';

/**
 * Speech in a player's colour, `--tone`: a paper face edged in it, sitting on an edge of it, with a
 * tail down to the speaker in the middle.
 */
export const speechClassName =
  'rounded-[14px] border-[1.5px] border-(--tone) bg-paper shadow-[0_3px_0_var(--tone)] after:absolute after:top-full after:left-1/2 after:-mt-1 after:size-2.5 after:-translate-x-1/2 after:rotate-45 after:border-r-[1.5px] after:border-b-[1.5px] after:border-(--tone) after:bg-paper';

interface BubbleProps {
  /** Whose avatar it sits above. On a phone it leans outwards, away from the safe. */
  side: SeatSide;
  /** A player speaking, in their seat's colour with a tail to them, or their clock, in the sun. */
  kind: 'say' | 'timer';
  icon: IconName;
  children: ReactNode;
}

/**
 * What sits above a player's avatar: what they say about the result, or the time they have left to
 * answer. It pops in each time it appears. Speech is centred on the avatar and leans outwards on a
 * phone; a clock, whose length depends on the contract's timeout, always keeps to the seat's outer
 * edge and grows towards the safe. Its seat gives the avatar's size as `--av`.
 */
export function Bubble({ side, kind, icon, children }: BubbleProps) {
  return (
    <p
      data-side={side}
      className={cn(
        'absolute bottom-[calc(100%+14px)] left-1/2 z-2 inline-flex origin-bottom -translate-x-1/2 animate-pop items-center gap-1.5 rounded-[14px] px-3 py-[7px] text-sm font-bold whitespace-nowrap',
        'max-xs:gap-1 max-xs:px-[9px] max-xs:py-1.5 max-xs:text-xs',
        'max-xs:data-[side=creator]:-left-[18px] max-xs:data-[side=creator]:translate-x-0',
        'max-xs:data-[side=opponent]:-right-[18px] max-xs:data-[side=opponent]:left-auto max-xs:data-[side=opponent]:translate-x-0',
        kind === 'timer' && [
          'bg-sun-soft text-sun-ink',
          'data-[side=creator]:-left-[18px] data-[side=creator]:translate-x-0',
          'data-[side=opponent]:-right-[18px] data-[side=opponent]:left-auto data-[side=opponent]:translate-x-0',
        ],
        kind === 'say' && [
          speechClassName,
          'text-ink [--tone:var(--color-red)] data-[side=opponent]:[--tone:var(--color-blue)]',
          'max-xs:data-[side=creator]:after:left-[calc(18px+var(--av)/2)]',
          'max-xs:data-[side=opponent]:after:right-[calc(18px+var(--av)/2)] max-xs:data-[side=opponent]:after:left-auto max-xs:data-[side=opponent]:after:translate-x-1/2',
        ]
      )}
    >
      <Icon name={icon} className={cn('size-4 max-xs:size-[13px]', kind === 'say' && 'text-(--tone)')} />
      <span>{children}</span>
    </p>
  );
}
