'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useDemoAutoplay } from '@/hooks/useDemoAutoplay';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Fly } from '@/hooks/useStakeFlights';
import {
  actorsFirst,
  clockLeft,
  DEMO_DEFAULT_OUTCOME,
  DEMO_LAST_STEP,
  demoStage,
  hasActed,
  pauseClock,
  resumeClock,
  startClock,
  type DemoOutcome,
  type DemoStill,
  type StepClock,
} from '@/lib/demoDuel';
import { SEAT_SIDES } from '@/lib/duel';

/** How long a played step stays on screen, its moves included, before the next one: its bar fills over it. */
export const DEMO_STEP_MS = 4800;

interface UseDemoDuelArgs {
  /** The demo plays itself once the first time this is mostly on screen. */
  root: RefObject<HTMLElement | null>;
  fly: Fly;
  cancelFlights: () => void;
}

/** Where the demo is: a step, and at the last one the ending shown. */
interface DemoAt {
  step: number;
  outcome: DemoOutcome | null;
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
  const [at, setAt] = useState<DemoAt>({ step: 0, outcome: null });
  const [view, setView] = useState(() => ({ stage: demoStage(0, null), jump: 0 }));
  const [isPlaying, setIsPlaying] = useState(false);
  /** The step whose bar fills while the play waits on it. */
  const [timing, setTiming] = useState<number | null>(null);
  /** A play just ended on the default ending: the other endings invite a pick. */
  const [isInviting, setIsInviting] = useState(false);

  const gen = useRef(0);
  const atNow = useRef(at);
  const stageNow = useRef(view.stage);
  const playing = useRef(false);
  const touched = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** The played step's time on screen; null when no play is on. */
  const clock = useRef<StepClock | null>(null);
  const isReduced = useRef(reducedMotion);

  useEffect(() => {
    isReduced.current = reducedMotion;
  }, [reducedMotion]);

  const moveTo = useCallback((next: DemoAt) => {
    atNow.current = next;
    setAt(next);
  }, []);

  const paint = useCallback((stage: DemoStill, isJump = false) => {
    stageNow.current = stage;
    setView((current) =>
      !isJump && current.stage === stage ? current : { stage, jump: isJump ? current.jump + 1 : current.jump }
    );
  }, []);

  const transition = useCallback(
    async (from: DemoStill, to: DemoStill, run: number) => {
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
          fly(side, 'in', { delay: index * 120 }).then((landed) => {
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
          flights.push(fly(side, 'out', { delay: index * 140, home: to.hasWinner ? 'creator' : side }));
        });
        paint(current);
      }
      await Promise.all(flights);
      if (alive()) paint(to);
    },
    [fly, paint]
  );

  /** Shows `next`, keeping the ending on screen at the last step unless another is asked for. */
  const go = useCallback(
    async (next: number, nextOutcome: DemoOutcome | null = null): Promise<boolean> => {
      const run = ++gen.current;
      clearTimeout(timer.current);
      cancelFlights();
      setTiming(null);
      if (next !== atNow.current.step + 1) {
        paint(demoStage(next - 1, null), true);
      }
      const outcome = next === DEMO_LAST_STEP ? (nextOutcome ?? atNow.current.outcome ?? DEMO_DEFAULT_OUTCOME) : null;
      moveTo({ step: next, outcome });
      await transition(stageNow.current, demoStage(next, outcome), run);
      return run === gen.current;
    },
    [cancelFlights, moveTo, paint, transition]
  );

  const stop = useCallback(() => {
    playing.current = false;
    clock.current = null;
    setIsPlaying(false);
    clearTimeout(timer.current);
    setTiming(null);
  }, []);

  /** Holds the play on its step: the step's bar stops where it is, and the rest of its time waits. */
  const pause = useCallback(() => {
    playing.current = false;
    setIsPlaying(false);
    clearTimeout(timer.current);
    if (clock.current) clock.current = pauseClock(clock.current, Date.now());
  }, []);

  const advance = useCallback(
    async function advanceStep() {
      if (!playing.current) return;
      const waitOut = () => {
        const held = clock.current;
        if (!held) return;
        timer.current = setTimeout(
          () => {
            if (held.step < DEMO_LAST_STEP) {
              void advanceStep();
              return;
            }
            stop();
            setIsInviting(true);
          },
          clockLeft(held, Date.now(), DEMO_STEP_MS)
        );
      };
      const held = clock.current;
      if (held && held.since === null && held.step === atNow.current.step) {
        clock.current = resumeClock(held, Date.now());
        // A step paused amid its moves waits them out first, as it would have anyway.
        if (held.isMoved) waitOut();
        return;
      }
      const next = atNow.current.step + 1;
      const moving = go(next);
      // The bar fills from the moment the step shows, its moves included, so it rises once and
      // evenly, rather than filling with the step and starting over once the moves end.
      clock.current = startClock(next, Date.now());
      setTiming(next);
      if (!(await moving) || clock.current?.step !== next) return;
      clock.current = { ...clock.current, isMoved: true };
      if (playing.current) waitOut();
    },
    [go, stop]
  );

  const play = useCallback(() => {
    playing.current = true;
    setIsPlaying(true);
    setIsInviting(false);
    if (atNow.current.step === DEMO_LAST_STEP && clock.current === null) {
      gen.current += 1;
      cancelFlights();
      moveTo({ step: 0, outcome: null });
      paint(demoStage(0, null), true);
    }
    void advance();
  }, [advance, cancelFlights, moveTo, paint]);

  const takeOver = useCallback(() => {
    touched.current = true;
    setIsInviting(false);
    stop();
  }, [stop]);

  const toggle = useCallback(() => {
    touched.current = true;
    if (playing.current) pause();
    else play();
  }, [play, pause]);

  const pickStep = useCallback(
    (next: number) => {
      takeOver();
      void go(next);
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

  useDemoAutoplay(root, reducedMotion, { play, pause, playing, touched });

  // A move still running when the demo goes away must not carry the play on through its steps.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      playing.current = false;
      gen.current += 1;
    },
    []
  );

  return { ...at, stage: view.stage, jump: view.jump, isPlaying, timing, isInviting, toggle, pickStep, pickOutcome };
}
