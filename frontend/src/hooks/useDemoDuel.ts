'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SEAT_SIDES, type SeatSide } from '@/lib/duel';
import {
  actorsFirst,
  DEMO_LAST_STEP,
  demoStage,
  hasActed,
  type DemoOutcome,
  type DemoStage,
} from '@/lib/demoDuel';

/** How long a played step stays on screen before the next one. */
export const DEMO_DWELL_MS = 3400;

interface UseDemoDuelArgs {
  /** The demo plays itself once the first time this is mostly on screen. */
  root: RefObject<HTMLElement | null>;
  fly: (side: SeatSide, direction: 'in' | 'out', home: SeatSide, delay: number) => Promise<boolean>;
  cancelFlights: () => void;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The demo duel's moves. Moving forward animates the difference between two stills: the players act
 * first, then the money moves, then the contract settles. Jumping anywhere else shows the step
 * before it at once and animates only the last move, so every click shows one clear change.
 * `jump` changes with every still shown at once, so figures can show it without counting.
 */
export function useDemoDuel({ root, fly, cancelFlights }: UseDemoDuelArgs) {
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [outcome, setOutcome] = useState<DemoOutcome | null>(null);
  const [view, setView] = useState(() => ({ stage: demoStage(0, null), jump: 0 }));
  const [isPlaying, setIsPlaying] = useState(false);
  /** The step whose bar fills while the play waits on it. */
  const [timing, setTiming] = useState<number | null>(null);
  /** A play just ended on the default ending: the other endings invite a pick. */
  const [isInviting, setIsInviting] = useState(false);

  const gen = useRef(0);
  const stepNow = useRef(0);
  const outcomeNow = useRef<DemoOutcome | null>(null);
  const stageNow = useRef(view.stage);
  const playing = useRef(false);
  const touched = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isReduced = useRef(reducedMotion);

  useEffect(() => {
    isReduced.current = reducedMotion;
  }, [reducedMotion]);

  const paint = useCallback((stage: DemoStage, isJump = false) => {
    stageNow.current = stage;
    setView((current) => ({ stage, jump: isJump ? current.jump + 1 : current.jump }));
  }, []);

  const transition = useCallback(
    async (from: DemoStage, to: DemoStage, run: number) => {
      const alive = () => run === gen.current;
      if (isReduced.current) {
        paint(to);
        return;
      }
      let current = actorsFirst(from, to);
      paint(current);
      await wait(hasActed(from, to) ? (to.timer === 'up' ? 1000 : 700) : 0);
      if (!alive()) return;

      const flights: Promise<unknown>[] = [];
      SEAT_SIDES.forEach((side, index) => {
        if (from.staked[side] || !to.staked[side]) return;
        current = { ...current, wallets: { ...current.wallets, [side]: to.wallets[side] } };
        flights.push(
          fly(side, 'in', side, index * 120).then((landed) => {
            if (!landed || !alive()) return;
            current = { ...current, staked: { ...current.staked, [side]: true } };
            paint(current);
          })
        );
      });
      paint(current);

      // Money out: the safe unlocks first, so it is clear the contract is the one releasing it.
      const leaving = SEAT_SIDES.filter((side) => from.staked[side] && !to.staked[side]);
      if (leaving.length > 0) {
        current = { ...current, isLocked: false };
        paint(current);
        await wait(420);
        if (!alive()) return;
        leaving.forEach((side, index) => {
          current = { ...current, staked: { ...current.staked, [side]: false } };
          flights.push(fly(side, 'out', to.hasWinner ? 'creator' : side, index * 140));
        });
        paint(current);
      }
      await Promise.all(flights);
      if (alive()) paint(to);
    },
    [fly, paint]
  );

  const go = useCallback(
    async (next: number, nextOutcome: DemoOutcome | null): Promise<boolean> => {
      const run = ++gen.current;
      clearTimeout(timer.current);
      cancelFlights();
      setTiming(null);
      if (next !== stepNow.current + 1) {
        paint(demoStage(next === DEMO_LAST_STEP ? DEMO_LAST_STEP - 1 : next - 1, null), true);
      }
      const ending = next === DEMO_LAST_STEP ? (nextOutcome ?? outcomeNow.current ?? 'confirm') : null;
      stepNow.current = next;
      outcomeNow.current = ending;
      setStep(next);
      setOutcome(ending);
      await transition(stageNow.current, demoStage(next, ending), run);
      return run === gen.current;
    },
    [cancelFlights, paint, transition]
  );

  const stop = useCallback(() => {
    playing.current = false;
    setIsPlaying(false);
    clearTimeout(timer.current);
    setTiming(null);
  }, []);

  const advance = useCallback(
    async function advanceStep() {
      if (!playing.current) return;
      const next = stepNow.current + 1;
      const isFinished = await go(next, next === DEMO_LAST_STEP ? 'confirm' : null);
      if (!isFinished || !playing.current) return;
      if (next === DEMO_LAST_STEP) {
        stop();
        setIsInviting(true);
        return;
      }
      setTiming(next);
      timer.current = setTimeout(() => void advanceStep(), DEMO_DWELL_MS);
    },
    [go, stop]
  );

  const play = useCallback(() => {
    playing.current = true;
    setIsPlaying(true);
    setIsInviting(false);
    if (stepNow.current === DEMO_LAST_STEP) {
      gen.current += 1;
      cancelFlights();
      stepNow.current = 0;
      outcomeNow.current = null;
      setStep(0);
      setOutcome(null);
      paint(demoStage(0, null), true);
    }
    void advance();
  }, [advance, cancelFlights, paint]);

  const takeOver = useCallback(() => {
    touched.current = true;
    setIsInviting(false);
    if (playing.current) stop();
  }, [stop]);

  const toggle = useCallback(() => {
    touched.current = true;
    if (playing.current) stop();
    else play();
  }, [play, stop]);

  const pickStep = useCallback(
    (next: number) => {
      takeOver();
      void go(next, next === DEMO_LAST_STEP ? outcomeNow.current : null);
    },
    [go, takeOver]
  );

  const pickOutcome = useCallback(
    (next: DemoOutcome) => {
      takeOver();
      void go(DEMO_LAST_STEP, next);
    },
    [go, takeOver]
  );

  useAutoplay(root, reducedMotion, { play, stop, playing, touched });

  useEffect(() => () => clearTimeout(timer.current), []);

  return { step, outcome, stage: view.stage, jump: view.jump, isPlaying, timing, isInviting, toggle, pickStep, pickOutcome };
}

/**
 * Plays the demo once on its own the first time it is mostly on screen, unless motion is reduced.
 * That play holds while the demo is scrolled away and goes on when it is back, so it is never spent
 * unseen; once the visitor takes over, it is theirs.
 */
function useAutoplay(
  root: RefObject<HTMLElement | null>,
  reducedMotion: boolean,
  { play, stop, playing, touched }: { play: () => void; stop: () => void; playing: RefObject<boolean>; touched: RefObject<boolean> }
) {
  useEffect(() => {
    const node = root.current;
    if (reducedMotion || !node || typeof IntersectionObserver === 'undefined') return;
    let hasStarted = false;
    let isHeld = false;
    let isSeen = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      hasStarted = true;
      isHeld = false;
      play();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        isSeen = entry.isIntersecting;
        // Taken over, or played through: from here the demo is the visitor's.
        if (touched.current || (hasStarted && !playing.current && !isHeld)) {
          observer.disconnect();
          return;
        }
        if (!isSeen) {
          if (playing.current) {
            isHeld = true;
            stop();
          }
          return;
        }
        if (isHeld) {
          start();
          return;
        }
        if (timer !== undefined) return;
        timer = setTimeout(() => {
          if (touched.current) return;
          if (isSeen) start();
          else isHeld = true;
        }, 700);
      },
      { threshold: 0.55 }
    );
    observer.observe(node);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [root, reducedMotion, play, stop, playing, touched]);
}
