'use client';

import { CreateDuelInvite } from '@/components/landing/CreateDuelInvite';
import { OpenDuelCard } from '@/components/landing/OpenDuelCard';
import { SINGLE_LAYOUT } from '@/components/landing/OpenDuels';
import { useIsOwnDuel } from '@/hooks/useIsOwnDuel';
import { lobbyColumns } from '@/lib/landingDuels';
import type { EnrichedDuel } from '@/lib/publicDuelsFilters';

interface OpenDuelGridProps {
  /** The page of open duels to show; at least one. */
  cards: readonly EnrichedDuel[];
  /** What brought these cards, a filter or a page: another set is dealt onto the table anew. */
  dealKey: string;
}

/**
 * Open duels as the landing lays them out: one is a wide card beside the invitation to make your
 * own, more are equal cards two or three across. Each new set is dealt in, a card after a card.
 */
export function OpenDuelGrid({ cards, dealKey }: OpenDuelGridProps) {
  const isOwn = useIsOwnDuel();

  if (cards.length === 1) {
    return (
      <div key={dealKey} className={SINGLE_LAYOUT}>
        <OpenDuelCard duel={cards[0]} isCompact={false} isOwn={isOwn(cards[0])} className="animate-rise" />
        <CreateDuelInvite variant="card" className="animate-rise [animation-delay:55ms]" />
      </div>
    );
  }
  return (
    <ul
      key={dealKey}
      data-columns={lobbyColumns(cards.length)}
      className="grid gap-5 split:grid-cols-2 wide:data-[columns=3]:grid-cols-3"
    >
      {cards.map((duel, index) => (
        <li key={duel.id} style={{ '--i': index }} className="grid animate-rise [animation-delay:calc(min(var(--i),8)*55ms)]">
          <OpenDuelCard duel={duel} isCompact isOwn={isOwn(duel)} />
        </li>
      ))}
    </ul>
  );
}
