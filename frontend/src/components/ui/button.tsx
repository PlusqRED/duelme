import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Buttons are keycaps that press down. Navy is every action, paper the quiet alternative beside
 * it, and sun is kept for taking a payout. Ghost has no keycap, for what should not compete with
 * the action on screen: sign out, back, a filter reset. It keeps the room below that a keycap's edge
 * takes, so the two line up side by side.
 *
 * `buttonVariants` gives a link the same look: `<Link className={buttonVariants({ size: 'lg' })}>`.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full text-center font-label no-underline select-none disabled:pointer-events-none disabled:opacity-55 data-disabled:pointer-events-none data-disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-5',
  {
    variants: {
      variant: {
        navy: 'keycap bg-ink text-paper [--keycap-edge:var(--color-ink-edge)]',
        paper:
          'keycap bg-paper text-ink [--keycap-edge:var(--color-line-strong)] [--keycap-ring:var(--color-line-strong)]',
        sun: 'keycap bg-sun text-ink [--keycap-edge:var(--color-sun-edge)]',
        ghost: 'mb-1 text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink',
      },
      // The line height rides on the type size: cn() drops a `leading-*` that comes before one.
      size: {
        sm: 'min-h-11 px-4 text-body-sm/[1.1]',
        md: 'min-h-12 px-[22px] text-base/[1.1]',
        lg: 'min-h-14 px-7 text-body/[1.1]',
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
