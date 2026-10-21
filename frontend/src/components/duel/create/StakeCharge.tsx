'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import { ChargeCell } from '@/components/duel/create/ChargeCell';
import { useChargeMotion } from '@/hooks/useChargeMotion';
import { easings } from '@/lib/easings';
import { cellsPerSpan, landingAt, nextMark, nudge, positionOf } from '@/lib/stakeScale';
import { cn } from '@/lib/utils';

/** A pointer that travels this far after pressing is dragging, not tapping. */
const DRAG_PX = 4;
/** The hint waits for the step to open and come into view, then slides out and back. */
const HINT_DELAY_MS = 650;
const HINT_MS = 380;
const HINT_AT = 0.07;

interface Drag {
  pointerId: number;
  x: number;
  hasMoved: boolean;
  /** A finger on the bar: it moves the keycap only once it slides sideways or lifts. */
  isPending: boolean;
  /** Grabbed by the keycap, it keeps its distance from the hand rather than jumping to it. */
  offset: number;
  hasChanged: boolean;
}

interface StakeChargeProps {
  /** The marks, from the minimum to the slider's end. */
  stops: readonly number[];
  /** The field's stake; null while none is typed. */
  stake: number | null;
  /** The field refuses its amount: under the minimum, or past USDT's decimals. */
  isInvalid: boolean;
  /** What the wallet holds; null signed out or before it is read: no flag and no hatching then. */
  limit: number | null;
  format: (stake: number) => string;
  label: string;
  /** What a screen reader hears before a stake is set. */
  emptyText: string;
  /** The step just opened with no stake: the keycap slides out a little and back, once. */
  shouldHint: boolean;
  onChange: (stake: number, isSettled: boolean) => void;
  onEnter: () => void;
}

/**
 * The stake slider, drawn as a game's power bar: cells that charge in the creator's red, a keycap
 * riding on them with the amount, and the marks under it, which a drag clicks into. Past what the
 * wallet holds the cells are hatched, and a stake that reaches there fills orange. The field and the
 * slider follow each other; a stake past the end sits at the end.
 */
export function StakeCharge({ stops, stake, isInvalid, limit, format, label, emptyText, shouldHint, onChange, onEnter }: StakeChargeProps) {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const cap = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLElement>(null);
  const marks = useRef<(HTMLSpanElement | null)[]>([]);
  const parts = useMemo(() => ({ root, bar, cap, text }), []);
  const motion = useChargeMotion(parts, stops, format);
  const { valueRef, limitRef, draggingRef, body, reducedRef, paint, moveTo, holdStill } = motion;
  const drag = useRef<Drag | null>(null);
  const detent = useRef<number | null>(null);
  const width = useRef(1);
  const hinted = useRef(false);
  const hasDrawn = useRef(false);
  const [perSpan, setPerSpan] = useState(4);
  const [isHeld, setIsHeld] = useState(false);
  const spans = stops.length - 1;
  const min = stops[0];
  const max = stops[spans];
  const count = spans * perSpan;
  const shownLimit = limit !== null && limit < max ? limit : null;
  const limitAt = shownLimit === null ? null : positionOf(stops, shownLimit);

  // The field's stake: the keycap glides to it, or is put there at once as the slider first draws.
  // A drag sets the field itself, so the field's echo of it is not followed.
  useEffect(() => {
    const target = stake === null ? 0 : positionOf(stops, stake);
    if (drag.current || (stake === valueRef.current && body.current.at === target)) return;
    valueRef.current = stake;
    moveTo(target, hasDrawn.current ? 'glide' : 'jump');
    hasDrawn.current = true;
  }, [stake, stops, valueRef, body, moveTo]);

  useEffect(() => {
    limitRef.current = shownLimit;
    paint();
  }, [shownLimit, count, limitRef, paint]);

  useEffect(() => {
    const node = bar.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      width.current = node.getBoundingClientRect().width || 1;
      root.current?.style.setProperty('--track-w', `${width.current}px`);
      setPerSpan(cellsPerSpan(width.current, spans));
      paint();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [spans, paint]);

  useEffect(() => {
    if (!shouldHint || hinted.current || valueRef.current !== null || reducedRef.current) return;
    hinted.current = true;
    let back: ReturnType<typeof setTimeout> | undefined;
    const out = setTimeout(() => {
      if (valueRef.current !== null || drag.current) return;
      moveTo(HINT_AT, 'glide');
      back = setTimeout(() => valueRef.current === null && !drag.current && moveTo(0, 'glide'), HINT_MS);
    }, HINT_DELAY_MS);
    return () => {
      clearTimeout(out);
      clearTimeout(back);
    };
  }, [shouldHint, valueRef, reducedRef, moveTo]);

  function choose(next: number, isSettled: boolean, how: 'glide' | null) {
    const hasChanged = next !== valueRef.current;
    valueRef.current = next;
    if (how) moveTo(positionOf(stops, next), how);
    else paint();
    if (hasChanged || isSettled) onChange(next, isSettled);
  }

  function positionAt(event: PointerEvent) {
    const box = bar.current?.getBoundingClientRect();
    if (!box?.width) return 0;
    return Math.min(1, Math.max(0, (event.clientX - (drag.current?.offset ?? 0) - box.left) / box.width));
  }

  function follow(event: PointerEvent) {
    const land = landingAt(stops, positionAt(event), width.current);
    if (land.mark !== null && land.mark !== detent.current && !reducedRef.current) {
      navigator.vibrate?.(6);
      marks.current[land.mark]?.animate([{ scale: 1 }, { scale: 1.35, offset: 0.4 }, { scale: 1 }], { duration: 340, easing: easings.spring });
    }
    detent.current = land.mark;
    if (drag.current && land.stake !== valueRef.current) drag.current.hasChanged = true;
    choose(land.stake, false, null);
    moveTo(land.position, 'follow');
  }

  function tapAt(event: PointerEvent) {
    const land = landingAt(stops, positionAt(event), width.current);
    detent.current = land.mark;
    if (drag.current) drag.current.hasChanged = true;
    choose(land.stake, false, 'glide');
  }

  function press(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    thumb.current?.focus({ preventScroll: true });
    const isOnThumb = !!thumb.current?.contains(event.target as Node);
    const isTouch = event.pointerType !== 'mouse';
    const box = bar.current?.getBoundingClientRect();
    const offset = isOnThumb && box ? event.clientX - (box.left + body.current.at * box.width) : 0;
    drag.current = { pointerId: event.pointerId, x: event.clientX, hasMoved: false, isPending: isTouch && !isOnThumb, offset, hasChanged: false };
    draggingRef.current = true;
    detent.current = null;
    if (isOnThumb || !isTouch) setIsHeld(true);
    if (!isOnThumb && !isTouch) tapAt(event);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    if (!current.hasMoved && Math.abs(event.clientX - current.x) < DRAG_PX) return;
    current.hasMoved = true;
    current.isPending = false;
    setIsHeld(true);
    holdStill();
    follow(event);
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    if (current.isPending && event.type === 'pointerup') tapAt(event);
    drag.current = null;
    draggingRef.current = false;
    setIsHeld(false);
    const value = valueRef.current;
    if (value === null) return paint();
    // The keycap settles on the amount it shows.
    moveTo(positionOf(stops, value), 'glide');
    if (current.hasChanged) onChange(value, true);
  }

  function pressKey(event: KeyboardEvent<HTMLDivElement>) {
    const { key } = event;
    const direction = ['ArrowRight', 'ArrowUp', 'PageUp'].includes(key) ? 1 : ['ArrowLeft', 'ArrowDown', 'PageDown'].includes(key) ? -1 : 0;
    let next: number;
    if (direction && event.shiftKey && key.startsWith('Arrow')) next = nudge(stops, valueRef.current, direction);
    else if (direction) next = nextMark(stops, valueRef.current, direction);
    else if (key === 'Home') next = min;
    else if (key === 'End') next = max;
    else if (key === 'Enter') {
      event.preventDefault();
      onEnter();
      return;
    } else return;
    event.preventDefault();
    choose(next, true, 'glide');
  }

  return (
    <div
      ref={root}
      data-held={isHeld || undefined}
      data-invalid={isInvalid || undefined}
      data-empty={(stake === null && !isHeld) || undefined}
      style={limitAt === null ? undefined : { '--limit': limitAt }}
      className="group/charge relative px-8 pt-0.5 select-none [--bar-h:26px] [--cap-h:46px] [-webkit-tap-highlight-color:transparent] max-xs:px-[30px] max-xs:[--cap-h:44px]"
    >
      <div
        onPointerDown={press}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
        className={cn('relative mb-1 h-(--cap-h) cursor-pointer touch-pan-y group-data-held/charge:cursor-grabbing', limitAt !== null && 'mt-7')}
      >
        {shownLimit !== null && (
          // Clear of the keycap's top, so it stays readable while the keycap passes under it.
          <span className="absolute bottom-[calc(50%+var(--cap-h)/2+4px)] left-[calc(var(--limit)*100%)] z-1 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-canvas py-[3px] pr-[9px] pl-[7px] text-xs font-bold whitespace-nowrap text-ink-2 tabular-nums transition-colors duration-200 after:absolute after:top-full after:left-1/2 after:-ml-px after:h-[calc((var(--cap-h)-var(--bar-h))/2+4px)] after:w-0.5 after:rounded-[1px] after:bg-line-strong after:transition-colors group-data-short/charge:bg-orange-wash group-data-short/charge:text-orange-ink group-data-short/charge:after:bg-orange">
            <Icon name="wallet" className="size-3.5" />
            <b>{format(shownLimit)}</b>
          </span>
        )}
        <div ref={bar} className="absolute inset-x-0 top-1/2 flex h-(--bar-h) -translate-y-1/2 gap-[3px]">
          {Array.from({ length: count }, (_, index) => (
            <ChargeCell key={`${count}-${index}`} past={limitAt === null ? 1 : Math.min(1, Math.max(0, limitAt * count - index))} />
          ))}
        </div>
        <div
          ref={thumb}
          role="slider"
          tabIndex={0}
          data-first
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={stake === null ? min : Math.min(max, Math.max(min, stake))}
          aria-valuetext={stake === null ? emptyText : `${format(stake)} USDT`}
          onKeyDown={pressKey}
          className="group/thumb absolute top-1/2 left-0 z-2 translate-x-[calc(var(--pos,0)*var(--track-w,0px)-50%)] -translate-y-[calc(50%+2px)] cursor-grab touch-pan-y rounded-[15px] outline-none group-data-held/charge:cursor-grabbing"
        >
          <span
            ref={cap}
            className={cn(
              'inline-flex h-(--cap-h) min-w-[76px] origin-bottom items-center justify-center rounded-[15px] bg-paper px-[3px] text-ink transition-[translate,box-shadow,color] duration-120 ease-press max-xs:min-w-[60px]',
              'shadow-[inset_0_0_0_2px_var(--color-ink),0_4px_0_var(--color-ink)] group-data-held/charge:translate-y-[3px] group-data-held/charge:shadow-[inset_0_0_0_2px_var(--color-ink),0_1px_0_var(--color-ink)]',
              'group-data-invalid/charge:text-orange-ink group-data-short/charge:text-orange-ink',
              'group-data-invalid/charge:shadow-[inset_0_0_0_2px_var(--color-orange),0_4px_0_var(--color-orange-ink)] group-data-short/charge:shadow-[inset_0_0_0_2px_var(--color-orange),0_4px_0_var(--color-orange-ink)]',
              'group-focus-visible/thumb:outline-3 group-focus-visible/thumb:outline-offset-3 group-focus-visible/thumb:outline-blue'
            )}
          >
            <Icon name="chevron" className="size-4 rotate-90 text-ink-3 transition-opacity group-data-at-start/charge:opacity-20 max-xs:size-3.5" />
            <b ref={text} className="min-w-[2ch] px-px text-center text-lg font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums group-data-empty/charge:text-line-strong" />
            <Icon name="chevron" className="size-4 -rotate-90 text-ink-3 transition-opacity group-data-at-end/charge:opacity-20 max-xs:size-3.5" />
          </span>
        </div>
      </div>
      {/* The marks are a shortcut for the hand; keyboards and screen readers use the slider itself. */}
      <div aria-hidden="true" className="relative h-[26px]">
        {stops.map((stop, index) => (
          <span
            key={stop}
            ref={(node) => {
              marks.current[index] = node;
            }}
            data-on={stop === stake || undefined}
            onClick={() => {
              thumb.current?.focus({ preventScroll: true });
              choose(stop, true, 'glide');
            }}
            style={{ '--at': index / spans }}
            className="absolute top-0 left-[calc(var(--at)*100%)] -translate-x-1/2 cursor-pointer px-1 pt-[9px] pb-0.5 text-xs/[1.2] font-bold whitespace-nowrap text-ink-3 tabular-nums transition-colors duration-200 before:absolute before:top-px before:left-1/2 before:-ml-px before:h-[5px] before:w-0.5 before:rounded-[1px] before:bg-line-strong hover:text-ink data-on:text-ink data-on:before:bg-ink"
          >
            {format(stop)}
          </span>
        ))}
      </div>
    </div>
  );
}
