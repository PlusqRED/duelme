import type { ReactNode, Ref } from 'react';
import { SafeLock } from '@/components/arena/SafeLock';
import { Stake } from '@/components/arena/Stake';
import { Chip } from '@/components/ui/chip';
import { SEAT_SIDES, type SafeTone, type SeatSide } from '@/lib/duel';
import { cn } from '@/lib/utils';

interface SafeProps {
  /** Which stakes sit in the window. */
  filled: Record<SeatSide, boolean>;
  /** Each stake's slot, where a stake in flight takes off from or lands. */
  slotRefs: Record<SeatSide, Ref<HTMLSpanElement>>;
  stakeLabel: string;
  /** The sum in the window, as the screen counts it. */
  total: ReactNode;
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
      <div className="relative flex h-(--box) w-full flex-col gap-2 rounded-3xl bg-ink px-2.5 pt-[26px] pb-2.5 shadow-safe">
        {isLocked && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-seal rounded-[inherit] border-6 border-sun/70 opacity-0"
          />
        )}
        <SafeLock isShut={isLocked} className="absolute -top-5 left-1/2 -translate-x-1/2 border-2 border-ink" />
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
      <Chip
        data-tone={state.tone}
        className="px-2.5 text-xs font-bold transition-colors duration-300 data-[tone=locked]:bg-ink data-[tone=locked]:text-paper data-[tone=paid]:bg-sun data-[tone=paid]:text-ink"
      >
        {state.label}
      </Chip>
    </div>
  );
}
