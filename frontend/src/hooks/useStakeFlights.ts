'use client';

import { useCallback, type RefObject } from 'react';
import { stakeClassName } from '@/components/arena/Stake';
import type { SeatSide } from '@/lib/duel';
import { cn } from '@/lib/utils';

const FLIGHT_MS = 900;

export interface FlightAnchors {
  /** What the flying stake is drawn in; it is positioned against it. */
  stage: RefObject<HTMLElement | null>;
  wallets: Record<SeatSide, RefObject<HTMLElement | null>>;
  slots: Record<SeatSide, RefObject<HTMLElement | null>>;
}

/**
 * Flies `side`'s stake between a wallet and its slot in the safe after `delay` ms: in from its own
 * wallet, or out to `home`'s, the winner's or its own. Says whether it landed.
 */
export type Fly = (side: SeatSide, direction: 'in' | 'out', delay: number, home?: SeatSide) => Promise<boolean>;

/**
 * A stake flying between a seat's wallet and its slot in the safe, on a short arc: into the safe as
 * it is staked, and out as the contract pays. Each flight is a copy of the slot's stake drawn over
 * the stage for as long as it flies; `cancel` drops them all.
 */
export function useStakeFlights({ stage, wallets, slots }: FlightAnchors) {
  const fly = useCallback<Fly>(
    (side, direction, delay, home = side) => {
      const box = stage.current;
      const wallet = wallets[direction === 'in' ? side : home].current;
      const slot = slots[side].current;
      if (!box || !wallet || !slot) {
        return Promise.resolve(false);
      }
      const [from, to] = direction === 'in' ? [wallet, slot] : [slot, wallet];
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
      token.className = cn(stakeClassName(side), 'pointer-events-none absolute top-0 left-0 z-3');
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
    [stage, wallets, slots]
  );

  const cancel = useCallback(() => {
    stage.current?.querySelectorAll<HTMLElement>('[data-flight]').forEach((token) => {
      token.getAnimations().forEach((animation) => animation.cancel());
      token.remove();
    });
  }, [stage]);

  return { fly, cancel };
}
