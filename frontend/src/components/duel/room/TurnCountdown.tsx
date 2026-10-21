'use client';

import { useClockValue } from '@/hooks/useNow';
import { useTranslation } from '@/i18n/useTranslation';
import type { Duel } from '@/lib/contracts';
import { secondsToAnswer } from '@/lib/duelPhase';
import { countdownClock } from '@/lib/timeWords';

interface TurnCountdownProps {
  duel: Pick<Duel, 'claimTimestamp'>;
  claimTimeout: number;
  /** What running out means for the reader; none for a watcher. */
  note: string | null;
}

/** The time left to answer a reported win, in the sun of a claim: the clock, and a bar that drains with it. */
export function TurnCountdown({ duel, claimTimeout, note }: TurnCountdownProps) {
  const { t } = useTranslation();
  const secondsLeft = useClockValue((now) => secondsToAnswer(duel, now, claimTimeout));
  const left = claimTimeout > 0 ? secondsLeft / claimTimeout : 0;

  return (
    // A clock read out every second would drown the panel; it is a timer, which is not announced.
    <div role="timer" aria-live="off" className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 rounded-[18px] bg-sun-soft px-4 py-3.5 text-sun-ink">
      <span className="row-span-2 text-[2rem] leading-none font-extrabold tracking-[-0.02em] tabular-nums">{countdownClock(secondsLeft)}</span>
      <span className="text-sm font-strong">{t('room.countdown.label')}</span>
      <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-md bg-sun-edge/22">
        <i
          style={{ '--left': left }}
          className="block h-full origin-left scale-x-(--left) rounded-[inherit] bg-sun-edge transition-[scale] duration-1000 ease-linear"
        />
      </span>
      {note && <span className="col-span-full text-sm">{note}</span>}
    </div>
  );
}
