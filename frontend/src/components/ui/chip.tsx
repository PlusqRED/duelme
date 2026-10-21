import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type ChipProps = ComponentProps<'span'>;

/** A small fact beside a heading or a row: the network, a count, a fee. */
export function Chip({ className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-canvas px-[9px] text-note font-label whitespace-nowrap text-ink-2',
        className
      )}
      {...props}
    />
  );
}
