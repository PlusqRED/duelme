'use client';

import type { ComponentProps } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />;
}

interface DialogContentProps extends DialogPrimitive.Popup.Props {
  /** Off while closing would hide a result that is still coming. */
  showCloseButton?: boolean;
}

/**
 * A window over a dimmed page: a card that grows downwards from a fixed top on a wide screen, so
 * it never jumps between steps, and a sheet from the bottom edge of a phone. A caller that needs
 * more room widens it with `min-[560px]:w-[…]`.
 */
function DialogContent({ className, children, showCloseButton = true, ...props }: DialogContentProps) {
  const { t } = useTranslation();

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-ink/50 transition-opacity duration-300 data-ending-style:opacity-0 data-ending-style:duration-200 data-starting-style:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 grid max-h-[94dvh] w-full gap-[18px] overflow-auto overscroll-contain rounded-t-[26px] bg-paper px-[clamp(16px,4vw,26px)] pt-[18px] pb-[22px] text-ink shadow-window outline-none transition-[translate] duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] before:-mt-2 before:-mb-1.5 before:h-1 before:w-10 before:justify-self-center before:rounded-full before:bg-line-strong data-ending-style:translate-y-full data-ending-style:duration-200 data-ending-style:ease-in data-starting-style:translate-y-full',
          'min-[560px]:top-[max(24px,7vh)] min-[560px]:bottom-auto min-[560px]:mx-auto min-[560px]:max-h-[calc(100dvh-2*max(24px,7vh))] min-[560px]:w-[min(580px,calc(100vw-32px))] min-[560px]:rounded-[28px] min-[560px]:transition-[opacity,translate,scale] min-[560px]:duration-300 min-[560px]:ease-spring min-[560px]:before:hidden min-[560px]:data-ending-style:translate-y-2.5 min-[560px]:data-ending-style:scale-98 min-[560px]:data-ending-style:opacity-0 min-[560px]:data-starting-style:translate-y-[18px] min-[560px]:data-starting-style:scale-97 min-[560px]:data-starting-style:opacity-0',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute top-3.5 right-3.5 grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-paper text-ink-2 transition-colors hover:border-line-strong hover:text-ink">
            <Icon name="x" />
            <span className="sr-only">{t('ui.close')}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-0.5 pr-12', className)} {...props} />;
}

function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-3 min-[560px]:flex-row min-[560px]:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title className={cn('text-lead font-extrabold tracking-[-0.02em]', className)} {...props} />;
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description className={cn('text-sm text-ink-3', className)} {...props} />;
}

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle };
