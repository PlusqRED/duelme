'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { Avatar } from '@/components/identity/Avatar';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import type { TurnTone } from '@/lib/turnView';
import { cn } from '@/lib/utils';

/** How long a new move ignores presses while it appears. */
const ARMING_MS = 700;

const panelTones: Record<TurnTone, string> = {
  quiet: '[--tone:var(--color-line)]',
  creator: '[--tone:var(--color-red)]',
  opponent: '[--tone:var(--color-blue)]',
  sun: '[--tone:var(--color-sun-edge)]',
};

const pillTones: Record<TurnTone, string> = {
  quiet: '[--dot:var(--color-ink-3)] bg-canvas',
  creator: '[--dot:var(--color-red)] bg-red-soft',
  opponent: '[--dot:var(--color-blue)] bg-blue-soft',
  sun: '[--dot:var(--color-sun-edge)] bg-sun-soft',
};

interface WhosePillProps {
  tone: TurnTone;
  label: string;
  /** The move is the reader's: the dot pulses. */
  isLive?: boolean;
  /** The other player, whose move it is. */
  avatar?: `0x${string}` | null;
  icon?: IconName;
}

/** Whose move it is, in that player's colour: their face, an icon, or a dot that pulses while the move is yours. */
export function WhosePill({ tone, label, isLive = false, avatar, icon }: WhosePillProps) {
  const mark = avatar ? (
    <Avatar address={avatar} tone={tone === 'creator' ? 'red' : 'blue'} className="-ml-1 size-5 inset-shadow-none" />
  ) : icon ? (
    <Icon name={icon} className="size-4 text-ink-3" />
  ) : (
    <i
      aria-hidden="true"
      className={cn(
        'relative size-2 rounded-full bg-(--dot)',
        isLive && 'after:absolute after:inset-0 after:animate-on-air after:rounded-full after:bg-(--dot)'
      )}
    />
  );
  return (
    <p className={cn('inline-flex h-[30px] items-center gap-2 justify-self-start rounded-full pr-3 pl-2.5 text-sm font-strong', pillTones[tone])}>
      {mark}
      <span>{label}</span>
    </p>
  );
}

/** Where the notch sits: under the middle of `target`, in pixels from the panel's left edge. */
function useNotch(panel: RefObject<HTMLElement | null>, target: RefObject<HTMLElement | null> | null): number | null {
  const [left, setLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!target) return undefined;
    const measure = () => {
      const box = panel.current?.getBoundingClientRect();
      const face = target.current?.getBoundingClientRect();
      if (!box?.width || !face) return;
      setLeft(Math.round(face.left + face.width / 2 - box.left));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (panel.current) observer?.observe(panel.current);
    if (target.current) observer?.observe(target.current);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [panel, target]);

  return target ? left : null;
}

interface TurnPanelProps {
  /** The edge's colour: the player whose move it is, the winner's sun, or none. */
  tone: TurnTone;
  /** The seat the notch points at; null for none. */
  pointAt: RefObject<HTMLElement | null> | null;
  whose: WhosePillProps;
  titleId: string;
  title: ReactNode;
  text?: ReactNode;
  /** A change is a new move: it swaps in, and ignores presses on `[data-action]` while it does. */
  swapKey?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * The "your move" panel under an arena, with a notch pointing at the seat it talks to: whose move
 * it is, what it is, and what can be done about it. A new move rises into place and ignores presses
 * until it has: the next choice often lands under the pointer that made the last one ("Join"
 * becomes "I won"), and a double click must not report a result. A redraw in place keeps still.
 */
export function TurnPanel({ tone, pointAt, whose, titleId, title, text, swapKey = '', className, children }: TurnPanelProps) {
  const panel = useRef<HTMLElement>(null);
  const notch = useNotch(panel, pointAt);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const isArming = readyKey !== swapKey;

  useEffect(() => {
    const timer = setTimeout(() => setReadyKey(swapKey), ARMING_MS);
    return () => clearTimeout(timer);
  }, [swapKey]);

  function holdWhileArming(event: MouseEvent) {
    if (isArming && event.target instanceof Element && event.target.closest('[data-action]')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <section
      ref={panel}
      aria-labelledby={titleId}
      aria-live="polite"
      data-arming={isArming ? '' : undefined}
      data-notch={notch === null ? 'none' : undefined}
      style={notch === null ? undefined : { '--caret': `${notch}px` }}
      onClickCapture={holdWhileArming}
      className={cn(
        'relative grid grid-cols-1 gap-4 rounded-3xl border-2 border-(--tone) bg-paper p-[clamp(18px,3vw,28px)] transition-[border-color] duration-350',
        // The notch: a square turned on its corner, its two outer edges the panel's.
        "before:absolute before:-top-2.5 before:left-0 before:size-[18px] before:translate-x-[calc(var(--caret)-9px)] before:rotate-45 before:rounded-tl-[4px] before:border-t-2 before:border-l-2 before:border-(--tone) before:bg-paper before:transition-[translate,border-color] before:duration-500 before:ease-spring before:content-['']",
        'data-[notch=none]:before:hidden',
        '[&>*]:animate-swap [&>:nth-child(2)]:[animation-delay:40ms] [&>:nth-child(n+3)]:[animation-delay:80ms]',
        '[&[data-arming]_[data-action]]:pointer-events-none',
        panelTones[tone],
        className
      )}
    >
      <Fragment key={swapKey}>
        <WhosePill {...whose} />
        <h2 id={titleId} className="-mt-1.5 text-[clamp(1.375rem,1.15rem+0.8vw,1.75rem)] tracking-[-0.025em] [overflow-wrap:anywhere]">
          {title}
        </h2>
        {text && <p className="-mt-1.5 max-w-[62ch] text-ink-2">{text}</p>}
        {children}
      </Fragment>
    </section>
  );
}
