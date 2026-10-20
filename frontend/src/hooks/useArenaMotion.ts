'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Fly } from '@/hooks/useStakeFlights';
import { actorsFirst, arrivalView, hasActed, type ArenaView } from '@/lib/arenaView';
import { SEAT_SIDES, type SeatSide } from '@/lib/duel';

/** Money that just landed on a seat, rising off the face; `id` tells two arrivals of the same sum apart. */
export interface ArenaGain {
  raw: bigint;
  id: number;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One string per view, so a poll that brings the same duel back does not replay anything. */
function viewKey(view: ArenaView): string {
  return JSON.stringify(view, (_, value: unknown) => (typeof value === 'bigint' ? value.toString() : value));
}

/**
 * The arena as shown, moving towards `target`. On arrival the stakes drop into the safe once, so the
 * first thing a visitor sees is where the money is. Each later change plays the landing demo's
 * order: the players act, then the money flies, then the contract settles. With motion reduced, or
 * when a newer change interrupts, the arena takes the new view at once.
 */
export function useArenaMotion(target: ArenaView, fly: Fly, cancelFlights: () => void) {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(() => (reducedMotion ? target : arrivalView(target)));
  const [gains, setGains] = useState<Partial<Record<SeatSide, ArenaGain>>>({});
  const painted = useRef(shown);
  const gen = useRef(0);
  const isEntering = useRef(true);
  const isReduced = useRef(reducedMotion);

  useEffect(() => {
    isReduced.current = reducedMotion;
  }, [reducedMotion]);

  const paint = useCallback((view: ArenaView) => {
    painted.current = view;
    setShown(view);
  }, []);

  const transition = useCallback(
    async (from: ArenaView, to: ArenaView, run: number, entering: boolean) => {
      const alive = () => run === gen.current;
      if (isReduced.current) {
        paint(to);
        return;
      }
      let current = actorsFirst(from, to);
      paint(current);
      await wait(hasActed(from, to) && !entering ? 650 : 0);
      if (!alive()) return;

      const flights: Promise<unknown>[] = [];
      SEAT_SIDES.forEach((side, index) => {
        if (from.staked[side] || !to.staked[side]) return;
        flights.push(
          fly(side, 'in', { delay: index * 140 }).then((landed) => {
            if (!landed || !alive()) return;
            current = { ...current, staked: { ...current.staked, [side]: true }, totalRaw: current.totalRaw + to.stakeRaw };
            paint(current);
          })
        );
      });

      // Money out: the safe unlocks first, so it is clear the contract is the one releasing it.
      const leaving = SEAT_SIDES.filter((side) => from.staked[side] && !to.staked[side]);
      const received: Partial<Record<SeatSide, bigint>> = {};
      if (leaving.length > 0) {
        current = { ...current, isLocked: false };
        paint(current);
        await wait(420);
        if (!alive()) return;
        const winner = SEAT_SIDES.find((side) => to.seats[side].isWinner);
        leaving.forEach((side, index) => {
          const home = from.isPayout && winner ? winner : side;
          received[home] = (received[home] ?? 0n) + to.stakeRaw;
          current = { ...current, staked: { ...current.staked, [side]: false }, totalRaw: current.totalRaw - to.stakeRaw };
          flights.push(fly(side, 'out', { delay: index * 140, home, isPrize: from.isPayout }));
        });
        paint(current);
      }
      await Promise.all(flights);
      if (!alive()) return;
      if (leaving.length > 0) {
        setGains((before) => {
          const next = { ...before };
          for (const side of SEAT_SIDES) {
            const raw = received[side];
            if (raw) next[side] = { raw, id: (before[side]?.id ?? 0) + 1 };
          }
          return next;
        });
      }
      paint(to);
    },
    [fly, paint]
  );

  // The view to move to, kept until a different one comes: a poll returns a new object each time.
  const key = viewKey(target);
  const [wanted, setWanted] = useState({ key, view: target });
  if (wanted.key !== key) {
    setWanted({ key, view: target });
  }

  useEffect(() => {
    const entering = isEntering.current;
    isEntering.current = false;
    const run = ++gen.current;
    cancelFlights();
    void transition(painted.current, wanted.view, run, entering);
  }, [wanted, cancelFlights, transition]);

  useEffect(
    () => () => {
      gen.current += 1;
    },
    []
  );

  return { shown, gains };
}
