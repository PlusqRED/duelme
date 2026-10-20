'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/useTranslation';
import type { StepStatus } from '@/lib/createSetup';
import { cn } from '@/lib/utils';

/** The step opens over a third of a second; it is brought into view once it has its height. */
const OPENED_MS = 360;

interface SetupStepProps {
  number: number;
  label: string;
  /** Said after the label until the step is answered: "optional". */
  aside?: string;
  status: StepStatus;
  /** The answer, on the step's line once it is closed; the steps double as the review. */
  value: ReactNode;
  /** Raised each time the player opens a step: an open step then takes the focus. */
  focusTurn: number;
  bodyId: string;
  onOpen: () => void;
  children: ReactNode;
}

/**
 * One of the setup's steps, as the landing's quest has them: a line with its number, a tick once
 * answered, and the answer under the name with Change; and the step itself, open one at a time. A
 * step the ones above it still wait on is dashed and cannot be opened; one that lost its answer is
 * orange. Opened by the player, the step's first control (`data-first`) takes the focus.
 */
export function SetupStep({ number, label, aside, status, value, focusTurn, bodyId, onOpen, children }: SetupStepProps) {
  const { t } = useTranslation();
  const isReduced = useReducedMotion();
  const item = useRef<HTMLLIElement>(null);
  const isOpen = status === 'current';
  const hasValue = !isOpen && value !== null;

  useEffect(() => {
    if (!isOpen || focusTurn === 0) return;
    item.current?.querySelector<HTMLElement>('[data-first]')?.focus({ preventScroll: true });
    const timer = setTimeout(
      () => item.current?.scrollIntoView({ block: 'nearest', behavior: isReduced ? 'auto' : 'smooth' }),
      isReduced ? 0 : OPENED_MS
    );
    return () => clearTimeout(timer);
    // Only the player's own opening moves the focus, not a change of motion settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, focusTurn]);

  return (
    <li
      ref={item}
      data-state={status}
      className={cn(
        'group/step scroll-mt-24 scroll-mb-[150px] rounded-tile border-[1.5px] border-line transition-[border-color,box-shadow] duration-250',
        'data-[state=current]:border-ink data-[state=current]:shadow-[0_3px_0_var(--color-ink)] data-[state=locked]:border-dashed data-[state=problem]:border-orange'
      )}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        disabled={status === 'locked'}
        onClick={() => !isOpen && onOpen()}
        className={cn(
          'grid min-h-14 w-full cursor-pointer grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-2xl px-3.5 py-2.5 text-left text-body font-bold hover:bg-canvas',
          'group-data-[state=current]/step:cursor-default group-data-[state=current]/step:hover:bg-transparent',
          'disabled:cursor-default disabled:text-ink-3 disabled:hover:bg-transparent'
        )}
      >
        <span className="relative col-start-1 row-span-2 row-start-1 grid size-8 place-items-center rounded-full bg-canvas-deep text-sm font-extrabold text-ink-2 transition-colors duration-300 group-data-[state=current]/step:bg-ink group-data-[state=current]/step:text-paper group-data-[state=done]/step:bg-good group-data-[state=done]/step:text-paper group-data-[state=problem]/step:bg-orange group-data-[state=problem]/step:text-paper">
          <b className="transition-opacity duration-200 group-data-[state=done]/step:opacity-0">{number}</b>
          <Icon
            name="check"
            className="absolute size-4 scale-40 stroke-3 opacity-0 transition-[opacity,scale] duration-400 ease-spring group-data-[state=done]/step:scale-100 group-data-[state=done]/step:opacity-100"
          />
        </span>
        <span className="col-start-2 row-start-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {label}
          {aside && !hasValue && <small className="text-note font-semibold text-ink-3">{aside}</small>}
        </span>
        {hasValue && (
          <span className="col-start-2 row-start-2 line-clamp-2 min-w-0 text-body-sm/[1.4] font-semibold text-ink-2 [overflow-wrap:anywhere]">
            {value}
          </span>
        )}
        {hasValue && status !== 'locked' && (
          <span className="col-start-3 row-span-2 row-start-1 text-sm font-label text-blue-deep underline decoration-blue-deep/30 decoration-2 underline-offset-4 max-[420px]:no-underline">
            <Icon name="pen" className="hidden size-5 max-[420px]:block" />
            <span className="max-[420px]:sr-only">{t('create.step.change')}</span>
          </span>
        )}
      </button>
      <div id={bodyId} hidden={!isOpen}>
        <div className="grid animate-swap grid-cols-1 gap-3.5 pr-[18px] pb-[18px] pl-[58px] max-xs:px-3.5 max-xs:pb-4">{children}</div>
      </div>
    </li>
  );
}

/** A closed step's answer with its mark: the game's tile, the lock or the globe. */
export function StepPick({ mark, children }: { mark: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-[7px] align-middle">
      {mark}
      <span>{children}</span>
    </span>
  );
}

/** A step's lead line, under its name. */
export function StepLead({ children }: { children: ReactNode }) {
  return <p className="-mt-1 max-w-[60ch] text-body-sm text-ink-2">{children}</p>;
}

/** A step's error, under the field it is about. */
export function StepError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="-mt-1.5 text-sm font-label text-orange-ink empty:hidden">
      {children}
    </p>
  );
}
