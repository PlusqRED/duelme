'use client';

import { useId } from 'react';
import { DeskTitle } from '@/components/dashboard/DeskTitle';
import { MiniDuelCard } from '@/components/dashboard/MiniDuelCard';
import type { DuelGame } from '@/hooks/useDashboard';
import type { MyDuel } from '@/lib/dashboard';

interface DuelBoardProps {
  title: string;
  /** The duels wait on the reader: the title has a live dot, as a duel page's state does. */
  isLive: boolean;
  entries: readonly MyDuel[];
  gameOf: (duelId: number) => DuelGame | null;
  nameOf: (address: string) => string;
  claimTimeout: number;
  /** How many cards come before this board's, so the cards of both boards take their stakes in turn. */
  orderFrom: number;
}

/** A group of duels that are on, Your move or Waiting, two cards a row where there is room. */
export function DuelBoard({ title, isLive, entries, gameOf, nameOf, claimTimeout, orderFrom }: DuelBoardProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId}>
      <DeskTitle id={titleId} count={entries.length} isLive={isLive}>
        {title}
      </DeskTitle>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 @min-[660px]/desk:grid-cols-2">
        {entries.map((entry, index) => (
          <MiniDuelCard
            key={entry.duel.id}
            entry={entry}
            game={gameOf(entry.duel.id)}
            nameOf={nameOf}
            claimTimeout={claimTimeout}
            order={orderFrom + index}
            isWide={index === entries.length - 1 && entries.length % 2 === 1}
          />
        ))}
      </div>
    </section>
  );
}
