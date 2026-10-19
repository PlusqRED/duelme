import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** A paper surface on the canvas, for a group of facts that belong together. */
function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-4 rounded-3xl border border-line bg-paper py-5 text-ink', className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid gap-1 px-5', className)} {...props} />;
}

function CardTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('text-lg font-strong leading-snug', className)} {...props} />;
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-5', className)} {...props} />;
}

export { Card, CardContent, CardHeader, CardTitle };
