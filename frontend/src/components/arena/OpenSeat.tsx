import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface OpenSeatProps {
  /**
   * The word for the reader, shown in the seat while they point at or tab into the duel it is part
   * of, a `group/duel`: the seat turns solid blue with them in it.
   */
  you?: string;
  /** Show the reader in the seat now: the duel page does while they point at Join. */
  isTaking?: boolean;
  /** The reader's own seat while they are not signed in: theirs, in their red, waiting for them. */
  isYours?: boolean;
  className?: string;
}

/** A seat nobody has taken yet: a dashed blue place for the opponent, breathing while it waits. */
export function OpenSeat({ you, isTaking = false, isYours = false, className }: OpenSeatProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid place-items-center rounded-full border-2 border-dashed border-blue bg-paper text-blue transition-colors duration-250',
        'before:pointer-events-none before:absolute before:-inset-[9px] before:animate-breathe before:rounded-full before:border-7 before:border-blue/12 before:opacity-0',
        isYours && 'border-red text-red before:border-red/12',
        you &&
          'group-focus-within/duel:border-solid group-focus-within/duel:bg-blue group-focus-within/duel:text-paper group-focus-within/duel:before:hidden group-hover/duel:border-solid group-hover/duel:bg-blue group-hover/duel:text-paper group-hover/duel:before:hidden',
        you && isTaking && 'border-solid bg-blue text-paper before:hidden',
        className
      )}
    >
      <Icon
        name="plus"
        className={cn(
          'size-[40%] transition-[scale,opacity] duration-300 ease-spring',
          you && 'group-focus-within/duel:scale-40 group-focus-within/duel:opacity-0 group-hover/duel:scale-40 group-hover/duel:opacity-0',
          you && isTaking && 'scale-40 opacity-0'
        )}
      />
      {you && (
        <span
          className={cn(
            'absolute scale-60 text-sm font-strong opacity-0 transition-[scale,opacity] duration-300 ease-spring group-focus-within/duel:scale-100 group-focus-within/duel:opacity-100 group-hover/duel:scale-100 group-hover/duel:opacity-100',
            isTaking && 'scale-100 opacity-100'
          )}
        >
          {you}
        </span>
      )}
    </span>
  );
}
