import { Identicon } from '@/components/identity/Identicon';
import { cn } from '@/lib/utils';

type AvatarTone = 'red' | 'blue' | 'ink' | 'paper';

const tones: Record<AvatarTone, string> = {
  red: 'bg-red text-paper inset-shadow-avatar',
  blue: 'bg-blue text-paper inset-shadow-avatar',
  ink: 'bg-ink text-paper inset-shadow-avatar',
  paper: 'bg-paper text-ink-2 ring-[1.5px] ring-line-strong ring-inset',
};

interface AvatarProps {
  address: string;
  /** The seat's colour: red for who created the duel, blue for who joined; ink or paper elsewhere. */
  tone: AvatarTone;
  className?: string;
}

/**
 * A player's face: their identicon on a round token, 44px unless the caller sizes it. The pattern
 * takes about half the token, rounded down to whole pixels per square where the browser can, so
 * its sharp edges fall the same on both sides of the mirror.
 */
export function Avatar({ address, tone, className }: AvatarProps) {
  return (
    <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', tones[tone], className)}>
      <Identicon
        address={address}
        className="size-[52%] supports-[width:round(down,1px,1px)]:size-[round(down,52%,5px)]"
      />
    </span>
  );
}
