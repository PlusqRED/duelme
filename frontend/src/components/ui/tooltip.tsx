'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';

type TooltipProviderProps = TooltipPrimitive.Provider.Props;

function TooltipProvider({ delay = 0, ...props }: TooltipProviderProps) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />;
}

const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

// Base UI also takes a className function of the popup's state, which cn() would drop.
interface TooltipContentProps
  extends Omit<TooltipPrimitive.Popup.Props, 'className'>,
    Pick<TooltipPrimitive.Positioner.Props, 'side' | 'sideOffset'> {
  className?: string;
}

/** A short ink note beside what it explains. */
function TooltipContent({ className, side = 'top', sideOffset = 6, children, ...props }: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset} className="isolate z-50">
        <TooltipPrimitive.Popup
          className={cn(
            'max-w-xs origin-(--transform-origin) rounded-xl bg-ink px-3 py-2 text-note text-paper shadow-menu transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
