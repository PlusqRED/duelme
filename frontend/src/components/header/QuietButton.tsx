import type { ComponentProps } from 'react';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { cn } from '@/lib/utils';

interface QuietButtonProps extends ComponentProps<'button'> {
  icon: IconName;
}

/** Words after an icon, for what should not compete in the menu: back, the key, signing out. */
export function QuietButton({ icon, className, children, ...props }: QuietButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center gap-[7px] text-body-sm font-label text-ink-2 transition-colors hover:text-ink',
        className
      )}
      {...props}
    >
      <Icon name={icon} className="size-[18px]" />
      {children}
    </button>
  );
}
