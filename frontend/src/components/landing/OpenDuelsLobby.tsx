'use client';

import { useRef } from 'react';
import { CreateDuelInvite } from '@/components/landing/CreateDuelInvite';
import { OpenDuelCard } from '@/components/landing/OpenDuelCard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSnapIndex } from '@/hooks/useSnapIndex';
import { lobbyColumns } from '@/lib/landingDuels';
import type { EnrichedDuel } from '@/lib/publicDuelsFilters';

interface OpenDuelsLobbyProps {
  duels: EnrichedDuel[];
  isOwn: (duel: EnrichedDuel) => boolean;
}

/**
 * Two or more open duels as equal cards: two or three across on a wide screen, and below that a
 * strip to swipe, the next card peeking in from the edge, with dots that follow it. A slim
 * invitation to make your own sits under them.
 */
export function OpenDuelsLobby({ duels, isOwn }: OpenDuelsLobbyProps) {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const inView = useSnapIndex(trackRef, duels.length);

  function showCard(index: number) {
    trackRef.current?.children[index]?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'start',
    });
  }

  return (
    <div>
      <div
        ref={trackRef}
        data-columns={lobbyColumns(duels.length)}
        className="relative grid gap-5 wide:grid-cols-2 wide:data-[columns=3]:grid-cols-3 max-wide:swipe-strip max-wide:gap-3 max-wide:pt-1 max-wide:pb-2"
      >
        {duels.map((duel) => (
          <OpenDuelCard
            key={duel.id}
            duel={duel}
            isCompact
            isOwn={isOwn(duel)}
            className="max-wide:basis-[min(86%,360px)]"
          />
        ))}
      </div>
      <div aria-hidden="true" className="mt-1.5 flex justify-center gap-1.5 wide:hidden">
        {duels.map((duel, index) => (
          <button
            key={duel.id}
            type="button"
            tabIndex={-1}
            onClick={() => showCard(index)}
            className="grid h-6 cursor-pointer place-items-center"
          >
            <span
              data-current={index === inView ? '' : undefined}
              className="block h-2 w-2 rounded-full bg-line-strong transition-colors data-current:w-6 data-current:bg-ink"
            />
          </button>
        ))}
      </div>
      <CreateDuelInvite variant="strip" />
    </div>
  );
}
