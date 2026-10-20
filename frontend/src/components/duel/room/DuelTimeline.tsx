'use client';

import { Clock } from 'lucide-react';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import type { Duel } from '@/lib/contracts';
import type { DuelPhase } from '@/lib/duelPhase';
import { formatDateTime } from '@/lib/utils';

type TimelineDuel = Pick<Duel, 'createdAt' | 'fundedAt' | 'cancelRequestedAt' | 'claimTimestamp' | 'finalizedAt'>;

interface TimelineEvent {
  key: TranslationKey;
  timestamp: bigint;
  dot: string;
}

/** How each ending is named in the timeline, and its dot. */
const endings: Partial<Record<DuelPhase, { key: TranslationKey; dot: string }>> = {
  resolved: { key: 'duel.timelineResolved', dot: 'bg-good' },
  refunded: { key: 'duel.timelineRefunded', dot: 'bg-ink-3' },
  cancelled: { key: 'duel.timelineCancelled', dot: 'bg-line-strong' },
  declined: { key: 'duel.timelineDeclined', dot: 'bg-orange' },
  disputed: { key: 'duel.timelineDisputed', dot: 'bg-orange' },
  mutual: { key: 'duel.timelineMutuallyCancelled', dot: 'bg-ink-3' },
};

/** The moments the contract recorded for a duel, in order, with the time to answer running out as one more. */
export function timelineEvents(duel: TimelineDuel, phase: DuelPhase, claimTimeout: number): TimelineEvent[] {
  const ending = endings[phase];
  const events: Array<TimelineEvent | null> = [
    { key: 'duel.timelineCreated', timestamp: duel.createdAt, dot: 'bg-blue' },
    duel.fundedAt > 0n ? { key: 'duel.timelineAccepted', timestamp: duel.fundedAt, dot: 'bg-good' } : null,
    duel.cancelRequestedAt > 0n
      ? { key: 'duel.timelineCancellationRequested', timestamp: duel.cancelRequestedAt, dot: 'bg-ink-3' }
      : null,
    duel.claimTimestamp > 0n ? { key: 'duel.timelineResultSubmitted', timestamp: duel.claimTimestamp, dot: 'bg-sun-edge' } : null,
    phase === 'timeout'
      ? { key: 'duel.timelineTimedOut', timestamp: duel.claimTimestamp + BigInt(claimTimeout), dot: 'bg-orange' }
      : null,
    duel.finalizedAt > 0n && ending ? { ...ending, timestamp: duel.finalizedAt } : null,
  ];
  return events.filter((event) => event !== null);
}

interface DuelTimelineProps {
  duel: TimelineDuel;
  phase: DuelPhase;
  claimTimeout: number;
}

/** The duel's timeline, kept from the old page until the duel page's own history replaces it. */
export function DuelTimeline({ duel, phase, claimTimeout }: DuelTimelineProps) {
  const { t, language } = useTranslation();

  return (
    <section className="rounded-3xl border border-line bg-paper p-5">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-ink-3" />
        <h2 className="text-sm font-semibold text-ink">{t('duel.timelineTitle')}</h2>
      </div>
      <ol className="space-y-3">
        {timelineEvents(duel, phase, claimTimeout).map((event) => (
          <li key={event.key} className="flex items-start justify-between gap-4">
            <span className="flex items-center gap-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${event.dot}`} />
              <span className="text-sm font-medium text-ink-2">{t(event.key)}</span>
            </span>
            <span className="text-right text-sm text-ink-3">{formatDateTime(event.timestamp, language)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
