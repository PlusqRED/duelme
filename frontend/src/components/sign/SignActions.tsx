import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The window's buttons, the way on first. On a phone they stay in reach at the bottom of the sheet
 * however long the step is, each a full row; a sticky box stops short of its scroller's padding, so
 * it reaches past the sheet's own.
 */
export function SignActions({ centered = false, children }: { centered?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2',
        centered && 'justify-center',
        'max-xs:sticky max-xs:-bottom-(--dialog-pb) max-xs:z-5 max-xs:-mx-1 max-xs:-mb-(--dialog-pb) max-xs:bg-linear-to-b max-xs:from-paper/0 max-xs:to-paper max-xs:to-[22%] max-xs:px-1 max-xs:pt-3.5 max-xs:pb-[calc(18px+env(safe-area-inset-bottom))] max-xs:*:flex-[1_1_100%]'
      )}
    >
      {children}
    </div>
  );
}
