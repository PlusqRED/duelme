'use client';

import type { ComponentProps } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;

// Base UI also takes a className function of the part's state, which cn() would drop; the parts
// below take a string for the same reason.
interface DialogContentProps extends Omit<DialogPrimitive.Popup.Props, 'className'> {
  className?: string;
  /** Off while closing would hide a result that is still coming. */
  showCloseButton?: boolean;
}

/**
 * A window over a dimmed page: a card that grows downwards from a fixed top on a wide screen, so
 * it never jumps between steps, and a sheet from the bottom edge of a phone. A caller that needs
 * more room sets `--dialog-width` (580px by default); the window still keeps clear of the edges.
 */
function DialogContent({ className, children, showCloseButton = true, ...props }: DialogContentProps) {
  const { t } = useTranslation();

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-ink/50 transition-opacity duration-300 data-ending-style:opacity-0 data-ending-style:duration-200 data-starting-style:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 grid max-h-[94dvh] w-full gap-[18px] overflow-auto overscroll-contain rounded-t-[26px] bg-paper px-[clamp(16px,4vw,26px)] pt-[26px] pb-(--dialog-pb) text-ink shadow-window outline-none transition-[translate] duration-400 ease-sheet [--dialog-pb:22px] [--dialog-width:580px] before:absolute before:inset-x-0 before:top-2.5 before:mx-auto before:h-1 before:w-10 before:rounded-full before:bg-line-strong data-ending-style:translate-y-full data-ending-style:duration-200 data-ending-style:ease-in data-starting-style:translate-y-full',
          'xs:top-[max(24px,7vh)] xs:bottom-auto xs:mx-auto xs:max-h-[calc(100dvh-2*max(24px,7vh))] xs:w-[min(var(--dialog-width),calc(100vw-32px))] xs:rounded-[28px] xs:pt-[18px] xs:transition-[opacity,translate,scale] xs:duration-300 xs:ease-spring xs:before:hidden xs:data-ending-style:translate-y-2.5 xs:data-ending-style:scale-98 xs:data-ending-style:opacity-0 xs:data-starting-style:translate-y-[18px] xs:data-starting-style:scale-97 xs:data-starting-style:opacity-0',
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

type DialogHeaderProps = ComponentProps<'div'>;

function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cn('flex flex-col gap-0.5 pr-12', className)} {...props} />;
}

interface DialogFooterProps extends ComponentProps<'div'> {
  /** On a phone the way on stays in reach at the bottom of the sheet, however long the window is. */
  isPinned?: boolean;
}

function DialogFooter({ isPinned = false, className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-3 xs:flex-row xs:justify-end',
        // A sticky box stops short of its scroller's padding, so it reaches past the sheet's own.
        isPinned &&
          'max-xs:sticky max-xs:-bottom-(--dialog-pb) max-xs:z-5 max-xs:-mx-1 max-xs:-mb-(--dialog-pb) max-xs:bg-linear-to-b max-xs:from-paper/0 max-xs:to-paper max-xs:to-[22%] max-xs:px-1 max-xs:pt-3.5 max-xs:pb-[calc(18px+env(safe-area-inset-bottom))]',
        className
      )}
      {...props}
    />
  );
}

interface DialogTitleProps extends Omit<DialogPrimitive.Title.Props, 'className'> {
  className?: string;
}

function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <DialogPrimitive.Title className={cn('text-lead font-extrabold tracking-[-0.02em]', className)} {...props} />;
}

interface DialogDescriptionProps extends Omit<DialogPrimitive.Description.Props, 'className'> {
  className?: string;
}

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <DialogPrimitive.Description className={cn('text-sm text-ink-3', className)} {...props} />;
}

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle };
