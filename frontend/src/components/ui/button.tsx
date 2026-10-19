import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Buttons are keycaps that press down. Navy is every action, paper the quiet alternative beside
 * it, and sun is kept for taking a payout. Ghost has no keycap, for what should not compete with
 * the action on screen: sign out, back, a filter reset.
 *
 * `buttonVariants` gives a link the same look: `<Link className={buttonVariants({ size: 'lg' })}>`.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full text-center leading-[1.1] font-label no-underline select-none disabled:pointer-events-none disabled:opacity-55 data-disabled:pointer-events-none data-disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-5',
  {
    variants: {
      variant: {
        navy: 'keycap bg-ink text-paper [--keycap-edge:var(--color-ink-edge)]',
        paper:
          'keycap bg-paper text-ink [--keycap-edge:var(--color-line-strong)] [--keycap-ring:var(--color-line-strong)]',
        sun: 'keycap bg-sun text-ink [--keycap-edge:var(--color-sun-edge)]',
        ghost: 'text-ink-2 transition-colors hover:bg-paper hover:text-ink',
      },
      size: {
        sm: 'min-h-11 px-4 text-body-sm',
        md: 'min-h-12 px-[22px] text-base',
        lg: 'min-h-14 px-7 text-body',
      },
    },
    defaultVariants: {
      variant: 'navy',
      size: 'md',
    },
  }
);

// Base UI also takes a className function of the button's state, which cn() would drop.
interface ButtonProps extends Omit<ButtonPrimitive.Props, 'className'>, VariantProps<typeof buttonVariants> {
  className?: string;
}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
