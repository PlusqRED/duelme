import type { ReactNode, Ref } from 'react';
import { Stake } from '@/components/arena/Stake';
import { Icon } from '@/components/ui/icon';
import { SEAT_SIDES, type SafeTone, type SeatSide } from '@/lib/duel';
import { cn } from '@/lib/utils';

interface SafeProps {
  /** Which stakes sit in the window. */
  filled: Record<SeatSide, boolean>;
  /** Each stake's slot, where a stake in flight takes off from or lands. */
  slotRefs: Record<SeatSide, Ref<HTMLSpanElement>>;
  stakeLabel: string;
  /** The sum in the window, as the screen counts it. */
  total: string;
  isLocked: boolean;
  name: string;
  state: { label: string; tone: SafeTone };
  /** What happens over the safe while the money is locked: the match being played. */
  above?: ReactNode;
}

/**
 * The contract between the seats: a navy safe with a window that shows each player's stake, the
 * sum it holds, and a lock that shuts in the sun once both stakes are in, with a flash as it seals.
 * Its stage gives its height as `--box`.
 */
export function Safe({ filled, slotRefs, stakeLabel, total, isLocked, name, state, above }: SafeProps) {
  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {above}
      <div className="relative flex h-(--box) w-full flex-col gap-2 rounded-3xl bg-ink px-2.5 pt-[26px] pb-2.5 shadow-[0_5px_0_var(--color-ink-edge)]">
        {isLocked && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-seal rounded-[inherit] border-6 border-sun/70 opacity-0"
          />
        )}
        <span
          aria-hidden="true"
          className={cn(
            'absolute -top-5 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full border-2 border-ink bg-paper text-ink transition-colors duration-300',
            isLocked && 'bg-sun'
          )}
        >
          <Icon
            name="safe"
            className={cn(
              'size-[22px] overflow-visible stroke-[2.2] [&>path:first-of-type]:-translate-y-[3.5px] [&>path:first-of-type]:transition-[translate] [&>path:first-of-type]:duration-400 [&>path:first-of-type]:ease-spring',
              isLocked && '[&>path:first-of-type]:translate-y-0'
            )}
          />
        </span>
        <span className="flex flex-1 gap-1.5 rounded-[14px] bg-paper/7 p-[5px] ring-1 ring-paper/12 ring-inset">
          {SEAT_SIDES.map((side) => (
            <span key={side} ref={slotRefs[side]} className="grid flex-1 rounded-[9px] border-[1.5px] border-dashed border-paper/20">
              <Stake side={side} aria-hidden="true" className={cn('-m-[1.5px]', !filled[side] && 'invisible')}>
                {stakeLabel}
              </Stake>
            </span>
          ))}
        </span>
        <p className="text-center text-xl/none font-extrabold tracking-[-0.02em] text-paper tabular-nums max-xs:text-[1.0625rem]/none">
          {total} <small className="text-[0.6875rem] font-semibold tracking-normal opacity-70">USDT</small>
        </p>
      </div>
      <p className="mt-1.5 text-center text-sm/[1.2] font-bold whitespace-nowrap max-xs:text-note/[1.2]">{name}</p>
      <p
        data-tone={state.tone}
        className="inline-flex h-6 items-center rounded-full bg-canvas px-2.5 text-xs font-bold whitespace-nowrap text-ink-2 transition-colors duration-300 data-[tone=locked]:bg-ink data-[tone=locked]:text-paper data-[tone=paid]:bg-sun data-[tone=paid]:text-ink"
      >
        {state.label}
      </p>
    </div>
  );
}
