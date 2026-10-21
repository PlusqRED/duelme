'use client';

import { useId, useState } from 'react';
import { OpenDuelGrid } from '@/components/duels/OpenDuelGrid';
import { OpenNowChip } from '@/components/duels/OpenNowChip';
import { CreateDuelInvite } from '@/components/landing/CreateDuelInvite';
import { SectionHead } from '@/components/landing/SectionHead';
import { Pager } from '@/components/lists/Pager';
import { useEnrichedPublicDuels } from '@/hooks/useEnrichedPublicDuels';
import { useTranslation } from '@/i18n/useTranslation';
import { clampPage, pageOf } from '@/lib/pages';
import type { PublicDuel } from '@/lib/publicDuelsFilters';

/** Cards a page holds: two rows of three, or three of two. */
const PAGE_SIZE = 6;

interface GameOpenDuelsProps {
  gameName: string;
  duels: readonly PublicDuel[];
  isLoading: boolean;
}

/** A game's open public duels as the lobby's tables, with the way to open another, or one when nobody waits. */
export function GameOpenDuels({ gameName, duels, isLoading }: GameOpenDuelsProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const enriched = useEnrichedPublicDuels(duels);
  const [page, setPage] = useState(1);
  const shownPage = clampPage(page, enriched.length, PAGE_SIZE);
  const cards = pageOf(enriched, shownPage, PAGE_SIZE);

  return (
    <section aria-labelledby={titleId} className="mb-[clamp(48px,6vw,80px)]">
      <SectionHead
        titleId={titleId}
        title={t('game.openTitle')}
        subtitle={t('game.openSubtitle', { game: gameName })}
        badge={<OpenNowChip count={duels.length} />}
      />
      {isLoading ? (
        <div aria-hidden="true" className="h-[26rem] animate-pulse rounded-3xl bg-paper split:max-w-[calc(50%-10px)]" />
      ) : cards.length === 0 ? (
        <CreateDuelInvite variant="card" title={t('game.noOpen', { game: gameName })} />
      ) : (
        <>
          <OpenDuelGrid cards={cards} dealKey={String(shownPage)} />
          <Pager page={shownPage} total={enriched.length} pageSize={PAGE_SIZE} onPage={setPage} />
          {cards.length > 1 && <CreateDuelInvite variant="strip" />}
        </>
      )}
    </section>
  );
}
