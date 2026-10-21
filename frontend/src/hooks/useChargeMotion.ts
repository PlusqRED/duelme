'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { easings } from '@/lib/easings';
import { springStep, type SpringBody, type SpringConfig } from '@/lib/spring';
import { stakeAt } from '@/lib/stakeScale';

/** A tap or a key glides: there in about a quarter of a second, overshooting by some 3% of the way. */
const GLIDE: SpringConfig = { k: 230, zeta: 0.74 };
/** A drag follows the hand closely. */
const FOLLOW: SpringConfig = { k: 2200, zeta: 1 };
/** The keycap leans with the speed it moves at, up to a few degrees, and swings upright. */
const LEAN: SpringConfig = { k: 260, zeta: 0.7 };
const LEAN_MAX_DEG = 7;
const LEAN_DEG_PER_PX = 0.011;
/** The longest frame a spring takes in one go, so a stalled tab does not fling the keycap. */
const MAX_FRAME_S = 0.034;

/** How the keycap gets somewhere: at once, closely after the hand, or gliding on a spring. */
export type ChargeMove = 'jump' | 'follow' | 'glide';

export interface ChargeParts {
  root: RefObject<HTMLDivElement | null>;
  bar: RefObject<HTMLDivElement | null>;
  cap: RefObject<HTMLSpanElement | null>;
  text: RefObject<HTMLElement | null>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The stake slider's motion, drawn straight onto its parts every frame rather than through React:
 * the keycap's place (`--pos`) and lean, each cell's fill (`--f`, a cell that fills up while the
 * bar charges pops once), the amount on the keycap, which counts on the way when it glides, and
 * whether that amount is past what the wallet holds (`data-short`). With motion reduced every move
 * is a jump.
 */
export function useChargeMotion(parts: ChargeParts, stops: readonly number[], format: (stake: number) => string) {
  const isReduced = useReducedMotion();
  const reducedRef = useRef(isReduced);
  const optionsRef = useRef({ stops, format });
  /** The stake the slider holds: what it was given, or picked. */
  const valueRef = useRef<number | null>(null);
  const limitRef = useRef<number | null>(null);
  /** A pointer is on it: the bar shows its fill even before a stake is picked. */
  const draggingRef = useRef(false);
  const body = useRef<SpringBody>({ at: 0, vel: 0 });
  const lean = useRef<SpringBody>({ at: 0, vel: 0 });
  const target = useRef(0);
  const config = useRef(GLIDE);
  /** A glide counts the amount from where it was to where it goes, then holds it while the keycap swings. */
  const glide = useRef<{ from: number; isThere: boolean } | null>(null);
  /** The amount on the keycap; undefined until it is first written. */
  const shown = useRef<number | null | undefined>(undefined);
  const fills = useRef<number[]>([]);
  const frame = useRef(0);
  const last = useRef(0);
  /** The frame step, for the step to ask for the next frame with. */
  const tick = useRef<(now: number) => void>(() => undefined);

  useEffect(() => {
    reducedRef.current = isReduced;
    optionsRef.current = { stops, format };
  }, [isReduced, stops, format]);

  const paint = useCallback(() => {
    const root = parts.root.current;
    const bar = parts.bar.current;
    if (!root || !bar) return;
    const { stops: marks, format: write } = optionsRef.current;
    const position = body.current.at;
    const value = valueRef.current;
    root.style.setProperty('--pos', String(clamp(position, -0.03, 1.03)));
    parts.cap.current?.style.setProperty('rotate', `${lean.current.at.toFixed(2)}deg`);

    const cells = Array.from(bar.children) as HTMLElement[];
    // A bar measured anew has other cells, none of them painted yet.
    if (fills.current.length !== cells.length) fills.current = cells.map(() => -1);
    const filled = value === null && !draggingRef.current ? 0 : clamp(position, 0, 1) * cells.length;
    const isMoving = draggingRef.current || glide.current !== null;
    cells.forEach((cell, index) => {
      const fill = clamp(filled - index, 0, 1);
      const before = fills.current[index];
      if (fill === before) return;
      if (fill === 1 && before < 1 && isMoving && !reducedRef.current) {
        cell.animate([{ scale: '1 1' }, { scale: '1 1.34', offset: 0.3 }, { scale: '1 1' }], { duration: 380, easing: easings.spring });
      }
      fills.current[index] = fill;
      cell.style.setProperty('--f', fill.toFixed(3));
    });

    let number = value;
    const gliding = glide.current;
    if (gliding && value !== null && !gliding.isThere) {
      const passing = clamp(stakeAt(marks, position), Math.min(gliding.from, value), Math.max(gliding.from, value));
      gliding.isThere = passing === value;
      number = passing;
    }
    if (number !== shown.current && parts.text.current) {
      shown.current = number;
      parts.text.current.replaceChildren(number === null ? '0' : write(number));
    }
    const limit = limitRef.current;
    root.toggleAttribute('data-short', limit !== null && number !== null && number > limit);
    root.toggleAttribute('data-at-start', position <= 0.001);
    root.toggleAttribute('data-at-end', position >= 0.999);
  }, [parts]);

  const step = useCallback(
    (now: number) => {
      const width = parts.bar.current?.getBoundingClientRect().width || 1;
      const dt = Math.min(MAX_FRAME_S, (now - last.current) / 1000);
      last.current = now;
      body.current = springStep(body.current, target.current, config.current, dt);
      const isMoving = draggingRef.current || glide.current !== null;
      const tilt = isMoving ? clamp(body.current.vel * width * LEAN_DEG_PER_PX, -LEAN_MAX_DEG, LEAN_MAX_DEG) : 0;
      lean.current = springStep(lean.current, tilt, LEAN, dt);
      const isStill = Math.abs(body.current.at - target.current) * width < 0.3 && Math.abs(body.current.vel) * width < 4;
      if (isStill && !draggingRef.current) {
        body.current = { at: target.current, vel: 0 };
        glide.current = null;
      }
      const isUpright = Math.abs(lean.current.at) < 0.05 && Math.abs(lean.current.vel) < 0.5;
      if (isUpright && !draggingRef.current && !glide.current) lean.current = { at: 0, vel: 0 };
      paint();
      frame.current = draggingRef.current || glide.current || !isUpright ? requestAnimationFrame((time) => tick.current(time)) : 0;
    },
    [parts, paint]
  );

  useEffect(() => {
    tick.current = step;
  }, [step]);

  const moveTo = useCallback(
    (position: number, how: ChargeMove) => {
      target.current = position;
      if (reducedRef.current || how === 'jump') {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
        body.current = { at: position, vel: 0 };
        lean.current = { at: 0, vel: 0 };
        glide.current = null;
        paint();
        return;
      }
      config.current = how === 'follow' ? FOLLOW : GLIDE;
      if (how === 'glide') glide.current = { from: shown.current ?? optionsRef.current.stops[0], isThere: false };
      if (frame.current) return;
      last.current = performance.now();
      frame.current = requestAnimationFrame(step);
    },
    [paint, step]
  );

  /** Stops a glide where it is, so the hand takes over. */
  const holdStill = useCallback(() => {
    glide.current = null;
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return { valueRef, limitRef, draggingRef, body, reducedRef, paint, moveTo, holdStill };
}
