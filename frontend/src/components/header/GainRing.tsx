import { cn } from '@/lib/utils';

/**
 * Money coming in: a green ring that flashes once around what holds it. The caller keys it by the
 * move, so each one plays it again, and gives it the holder's inset, radius and border.
 */
export function GainRing({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('pointer-events-none absolute animate-gain-ring border-good opacity-0 ring-4 ring-good-soft', className)}
    />
  );
}
