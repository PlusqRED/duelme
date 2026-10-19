import type { ComponentProps } from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from '@/lib/utils';

type InputProps = ComponentProps<'input'>;

/** A text field: a paper well whose border darkens to ink while it has the focus. */
function Input({ className, ...props }: InputProps) {
  return (
    <InputPrimitive
      className={cn(
        'h-12 w-full min-w-0 rounded-2xl border-[1.5px] border-line-strong bg-paper px-4 text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-3 focus:border-ink focus:ring-3 focus:ring-canvas-deep disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-orange',
        className
      )}
      {...props}
    />
  );
}

export { Input };
