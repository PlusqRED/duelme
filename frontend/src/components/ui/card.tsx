import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type CardProps = ComponentProps<'div'>;

/** A paper surface on the canvas, for a group of facts that belong together. */
function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('flex flex-col gap-4 rounded-3xl border border-line bg-paper py-5 text-ink', className)}
      {...props}
    />
  );
}

type CardHeaderProps = ComponentProps<'div'>;

function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div className={cn('grid gap-1 px-5', className)} {...props} />;
}

type CardTitleProps = ComponentProps<'div'>;

function CardTitle({ className, ...props }: CardTitleProps) {
  return <div className={cn('text-lg/snug font-strong', className)} {...props} />;
}

type CardContentProps = ComponentProps<'div'>;

function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn('px-5', className)} {...props} />;
}

export { Card, CardContent, CardHeader, CardTitle };
