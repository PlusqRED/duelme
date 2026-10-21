import { cn } from '@/lib/utils';

/** Something under way: a ring turning in the text colour. Decorative; the words beside it say what. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-current border-t-transparent', className)}
    />
  );
}
