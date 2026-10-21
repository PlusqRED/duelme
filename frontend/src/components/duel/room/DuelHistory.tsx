'use client';

import { useId, useMemo, useState } from 'react';
import { Avatar } from '@/components/identity/Avatar';
import { PlayerLink } from '@/components/identity/PlayerLink';
import { useNicknames } from '@/hooks/useNicknames';
import { useClockValue } from '@/hooks/useNow';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { useTranslation } from '@/i18n/useTranslation';
import { duelHistory, type HistoryDuel, type HistoryEvent, type HistoryTone } from '@/lib/duelHistory';
import type { Duel } from '@/lib/contracts';
import type { DuelPhase } from '@/lib/duelPhase';
import { cn, formatDateTime, formatUSDT } from '@/lib/utils';

/** Stands in for the name inside a translated line, which is cut there to put the face and name in. */
const WHO = '\u0000';

const dotTones: Record<HistoryTone, string> = {
  creator: 'bg-red',
  opponent: 'bg-blue',
  sun: 'bg-sun',
  late: 'bg-orange',
  ink: 'bg-ink',
};

interface DuelHistoryProps {
  duel: HistoryDuel & Pick<Duel, 'wagerAmount'>;
  phase: DuelPhase;
  claimTimeout: number;
  /** The reader's wallet, lowercased: their own lines say "You". */
  walletAddress: string | undefined;
}

/**
 * What happened in the duel, oldest first: a dot in the colour of who acted, their face and name in
 * the line, how long ago with the exact time on hover, and the creator's message quoted. A line that
 * arrives while the page is open rises into place.
 */
export function DuelHistory({ duel, phase, claimTimeout, walletAddress }: DuelHistoryProps) {
  const { t, language } = useTranslation();
  const titleId = useId();
  const timeAgo = useTimeAgo();
  // "5m ago" moves on while the page stays open.
  useClockValue((now) => Math.floor(now / 30));
  const players = useMemo(() => [duel.creator, duel.opponent], [duel.creator, duel.opponent]);
  const { resolveDisplay } = useNicknames(players);
  const events = duelHistory(duel, phase, claimTimeout);
  const [firstCount] = useState(events.length);
  const pot = formatUSDT(duel.wagerAmount * 2n, language);

  const who = (address: `0x${string}`) => (
    <PlayerLink address={address} className="inline-flex items-center gap-[5px] align-bottom tabular-nums">
      <Avatar
        address={address}
        tone={address.toLowerCase() === duel.creator.toLowerCase() ? 'red' : 'blue'}
        // Half of 18px rounds down to a pattern of 5px; at 10px each square still gets whole pixels.
        className="size-[18px] inset-shadow-none [&>svg]:size-[10px]"
      />
      <span>{address.toLowerCase() === walletAddress ? t('room.you') : resolveDisplay(address)}</span>
    </PlayerLink>
  );

  const line = (event: HistoryEvent) => {
    const [before, after] = t(event.key, { who: WHO, pot }).split(WHO);
    return (
      <>
        {before}
        {event.who && after !== undefined && (
          <>
            {who(event.who)}
            {after}
          </>
        )}
      </>
    );
  };

  return (
    <section aria-labelledby={titleId} className="rounded-3xl border border-line bg-paper px-[22px] py-5">
      <h2 id={titleId} className="mb-2 text-body/[1.12] tracking-[-0.01em]">
        {t('room.history.title')}
      </h2>
      <ol>
        {events.map((event, index) => (
          <li
            key={event.key}
            className={cn(
              'relative grid grid-cols-[22px_minmax(0,1fr)] gap-x-2.5 gap-y-px py-2',
              "before:absolute before:top-7 before:-bottom-2.5 before:left-2.5 before:w-0.5 before:bg-line before:content-[''] last:before:hidden",
              index >= firstCount && 'animate-swap'
            )}
          >
            <span aria-hidden="true" className={cn('row-span-2 m-[5px] size-3 rounded-full shadow-[0_0_0_3px_var(--color-paper)]', dotTones[event.tone])} />
            <p className="text-body-sm/[1.35] font-label">{line(event)}</p>
            <time dateTime={new Date(Number(event.at) * 1000).toISOString()} title={formatDateTime(event.at, language)} className="text-note text-ink-3">
              {timeAgo(event.at)}
            </time>
            {event.quote && (
              <p className="col-start-2 mt-1 justify-self-start rounded-r-[10px] border-l-3 border-red bg-canvas px-2.5 py-[5px] text-sm [overflow-wrap:anywhere]">
                “{event.quote}”
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
