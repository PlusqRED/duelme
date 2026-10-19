'use client';

import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { Icon } from '@/components/ui/icon';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

/** Narrower than the `xs` breakpoint, where a menu is a sheet from the bottom edge. */
const PHONE = '(width < 35rem)';

type PopoverProps = Omit<PopoverPrimitive.Root.Props, 'modal'>;

/**
 * A menu that hangs under its button on a wide screen and is a sheet from the bottom of a phone,
 * as the top bar's wallet and navigation menus open. On a phone it is modal: the page behind is
 * dimmed, does not scroll and cannot take the focus. Esc, a click outside and Tab out close it, and
 * the focus goes back to its button.
 */
function Popover(props: PopoverProps) {
  const isPhone = useMediaQuery(PHONE);
  return <PopoverPrimitive.Root modal={isPhone} {...props} />;
}

const PopoverTrigger = PopoverPrimitive.Trigger;

interface PopoverContentProps extends Omit<PopoverPrimitive.Popup.Props, 'className' | 'title'> {
  /** The menu's name: the sheet's title on a phone, and read out on a wide screen. */
  title: string;
  className?: string;
}

/** The menu itself, 400px wide on a wide screen unless the caller sets `--panel-width`. */
function PopoverContent({ title, className, children, ...props }: PopoverContentProps) {
  const { t } = useTranslation();

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Backdrop className="fixed inset-0 z-50 bg-ink/30 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 xs:hidden" />
      <PopoverPrimitive.Positioner
        side="bottom"
        align="end"
        sideOffset={10}
        collisionPadding={16}
        positionMethod="fixed"
        className="z-50 max-xs:top-auto! max-xs:right-0! max-xs:bottom-0! max-xs:left-0! max-xs:transform-none!"
      >
        <PopoverPrimitive.Popup
          className={cn(
            'grid max-h-[90dvh] w-full content-start gap-3 overflow-auto overscroll-contain rounded-t-[26px] border-t border-line bg-paper px-4 pt-2.5 pb-[18px] text-ink shadow-sheet outline-none transition-[translate] duration-300 ease-press [--panel-width:400px] data-ending-style:translate-y-full data-starting-style:translate-y-full',
            'xs:max-h-[calc(100dvh-96px)] xs:w-[min(var(--panel-width),calc(100vw-32px))] xs:origin-(--transform-origin) xs:rounded-[24px] xs:border xs:p-[18px] xs:shadow-menu xs:transition-[opacity,scale] xs:duration-200 xs:data-ending-style:translate-y-0 xs:data-ending-style:scale-96 xs:data-ending-style:opacity-0 xs:data-starting-style:translate-y-0 xs:data-starting-style:scale-96 xs:data-starting-style:opacity-0',
            className
          )}
          {...props}
        >
          <div className="relative mb-1.5 flex min-h-11 items-center before:absolute before:-top-0.5 before:left-1/2 before:h-1 before:w-10 before:-translate-x-1/2 before:rounded-full before:bg-line-strong xs:sr-only">
            <PopoverPrimitive.Title className="text-lg font-extrabold">{title}</PopoverPrimitive.Title>
            <PopoverPrimitive.Close className="-mt-1.5 -mr-1.5 ml-auto grid size-11 cursor-pointer place-items-center rounded-full bg-canvas text-ink-2 xs:hidden">
              <Icon name="x" />
              <span className="sr-only">{t('ui.close')}</span>
            </PopoverPrimitive.Close>
          </div>
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
