import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

/** A seat nobody has taken yet: a dashed blue place for the opponent, breathing while it waits. */
export function OpenSeat({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid place-items-center rounded-full border-2 border-dashed border-blue bg-paper text-blue',
        'before:pointer-events-none before:absolute before:-inset-[9px] before:animate-breathe before:rounded-full before:border-7 before:border-blue/12 before:opacity-0',
        className
      )}
    >
      <Icon name="plus" className="size-[40%]" />
    </span>
  );
}
