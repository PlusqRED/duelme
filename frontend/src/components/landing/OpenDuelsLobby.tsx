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
  timeAgo: (timestamp: bigint) => string;
}

/**
 * Two or more open duels as equal cards: two or three across on a wide screen, and below that a
 * strip to swipe, the next card peeking in from the edge, with dots that follow it. A slim
 * invitation to make your own sits under them.
 */
export function OpenDuelsLobby({ duels, isOwn, timeAgo }: OpenDuelsLobbyProps) {
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
        className="relative grid gap-5 wide:grid-cols-2 wide:data-[columns=3]:grid-cols-3 max-wide:-mx-gutter max-wide:flex max-wide:snap-x max-wide:snap-mandatory max-wide:scroll-px-gutter max-wide:gap-3 max-wide:overflow-x-auto max-wide:overscroll-x-contain max-wide:px-gutter max-wide:pt-1 max-wide:pb-2 max-wide:[scrollbar-width:none]"
      >
        {duels.map((duel) => (
          <OpenDuelCard
            key={duel.id}
            duel={duel}
            isCompact
            isOwn={isOwn(duel)}
            timeAgo={timeAgo}
            className="max-wide:shrink-0 max-wide:basis-[min(86%,360px)] max-wide:snap-start"
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
