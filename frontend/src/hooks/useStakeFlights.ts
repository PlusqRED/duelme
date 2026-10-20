'use client';

import { useCallback, type RefObject } from 'react';
import { stakeClassName } from '@/components/arena/Stake';
import type { SeatSide } from '@/lib/duel';
import { cn } from '@/lib/utils';

const FLIGHT_MS = 900;

export interface FlightAnchors {
  /** What the flying stake is drawn in; it is positioned against it. */
  stage: RefObject<HTMLElement | null>;
  /** Where each seat's money leaves from and lands: a wallet on the landing, a face on a duel's page. */
  homes: Record<SeatSide, RefObject<HTMLElement | null>>;
  slots: Record<SeatSide, RefObject<HTMLElement | null>>;
}

interface FlightOptions {
  delay: number;
  /** Where a stake flying out lands: the winner's seat, or by default its own. */
  home?: SeatSide;
  /** The stake is the winner's now, so it flies in the sun. */
  isPrize?: boolean;
}

/**
 * Flies `side`'s stake between a seat and its slot in the safe: in from its own seat, or out to
 * `home`. Says whether it landed.
 */
export type Fly = (side: SeatSide, direction: 'in' | 'out', options: FlightOptions) => Promise<boolean>;

/**
 * A stake flying between a seat and its slot in the safe, on a short arc: into the safe as it is
 * staked, and out as the contract pays. Each flight is a copy of the slot's stake drawn over the
 * stage for as long as it flies; `cancel` drops them all.
 */
export function useStakeFlights({ stage, homes, slots }: FlightAnchors) {
  const fly = useCallback<Fly>(
    (side, direction, { delay, home = side, isPrize = false }) => {
      const box = stage.current;
      const seat = homes[direction === 'in' ? side : home].current;
      const slot = slots[side].current;
      if (!box || !seat || !slot) {
        return Promise.resolve(false);
      }
      const [from, to] = direction === 'in' ? [seat, slot] : [slot, seat];
      const size = slot.getBoundingClientRect();
      const origin = box.getBoundingClientRect();
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const x0 = a.left + a.width / 2 - origin.left - size.width / 2;
      const y0 = a.top + a.height / 2 - origin.top - size.height / 2;
      const dx = b.left + b.width / 2 - origin.left - size.width / 2 - x0;
      const dy = b.top + b.height / 2 - origin.top - size.height / 2 - y0;
      const lift = -Math.max(26, Math.abs(dx) * 0.22);
      const at = (x: number, y: number, scale: number) => `translate(${x0 + x}px, ${y0 + y}px) scale(${scale})`;
      const isLanding = direction === 'out';

      const token = document.createElement('i');
      token.dataset.flight = '';
      token.setAttribute('aria-hidden', 'true');
      token.className = cn(stakeClassName(side, isPrize), 'pointer-events-none absolute top-0 left-0 z-3');
      token.style.width = `${size.width}px`;
      token.style.height = `${size.height}px`;
      token.textContent = slot.textContent;
      box.append(token);

      const animation = token.animate(
        [
          { transform: at(0, 0, isLanding ? 1 : 0.4), opacity: isLanding ? 1 : 0 },
          { transform: at(0, -4, 1), opacity: 1, offset: 0.16 },
          { transform: at(dx * 0.5, dy * 0.5 + lift, 1.08), offset: 0.56 },
          { transform: at(dx, dy, isLanding ? 0.45 : 1), opacity: isLanding ? 0 : 1 },
        ],
        { duration: FLIGHT_MS, delay, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'both' }
      );
      return animation.finished.then(
        () => {
          token.remove();
          return true;
        },
        () => {
          token.remove();
          return false;
        }
      );
    },
    [stage, homes, slots]
  );

  const cancel = useCallback(() => {
    stage.current?.querySelectorAll<HTMLElement>('[data-flight]').forEach((token) => {
      token.getAnimations().forEach((animation) => animation.cancel());
      token.remove();
    });
  }, [stage]);

  return { fly, cancel };
}
