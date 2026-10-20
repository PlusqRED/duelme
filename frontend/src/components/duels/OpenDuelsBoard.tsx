'use client';

import { useId, useMemo, useState } from 'react';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';
import { OpenDuelGrid } from '@/components/duels/OpenDuelGrid';
import { OpenDuelsFilters } from '@/components/duels/OpenDuelsFilters';
import { OpenNowChip } from '@/components/duels/OpenNowChip';
import { CreateDuelInvite } from '@/components/landing/CreateDuelInvite';
import { SectionHead } from '@/components/landing/SectionHead';
import { PageColumn } from '@/components/layout/PageColumn';
import { Pager } from '@/components/lists/Pager';
import { Button } from '@/components/ui/button';
import { useEnrichedPublicDuels } from '@/hooks/useEnrichedPublicDuels';
import { usePublicDuels } from '@/hooks/usePublicDuels';
import { useTranslation } from '@/i18n/useTranslation';
import { buildPublicDuelSearchText, normalizeSearchQuery } from '@/lib/duelSearch';
import { clampPage, pageOf } from '@/lib/pages';
import { filterOpenDuels, openDuelGames, type StakeBand } from '@/lib/publicDuelsFilters';

/** Cards a page holds: whole rows of three, or of two. */
const PAGE_SIZE = 18;

/**
 * Every open public duel as the landing's tables waiting for a second player: a search, the games
 * they are in and the stake bands to narrow them, then the cards, dealt onto the page as a filter
 * brings them, and the way to a duel on other terms.
 */
export function OpenDuelsBoard() {
  const { t, language } = useTranslation();
  const titleId = useId();
  const { duels, isLoading, isError, retry } = usePublicDuels();
  const enriched = useEnrichedPublicDuels(duels);
  const [query, setQuery] = useState('');
  const [game, setGame] = useState<string | null>(null);
  const [stake, setStake] = useState<StakeBand | null>(null);
  const [page, setPage] = useState(1);

  const games = useMemo(() => openDuelGames(enriched), [enriched]);
  // Built once per list and language rather than per keystroke: each duel's text formats its amounts.
  const textById = useMemo(
    () => new Map(enriched.map((duel) => [duel.id, buildPublicDuelSearchText(duel, t, language)])),
    [enriched, t, language]
  );
  const normalizedQuery = normalizeSearchQuery(query, language);
  const shown = filterOpenDuels(enriched, { game, stake, normalizedQuery }, textById);
  const shownPage = clampPage(page, shown.length, PAGE_SIZE);
  const cards = pageOf(shown, shownPage, PAGE_SIZE);

  function narrow(change: () => void) {
    change();
    setPage(1);
  }

  return (
    <PageColumn>
      <SectionHead
        isPageTitle
        titleId={titleId}
        title={t('publicDuels.title')}
        subtitle={t('publicDuels.subtitle')}
        badge={<OpenNowChip count={duels.length} />}
      />
      <PartialDataNotice when={isError} onRetry={retry} />
      {duels.length > 0 && (
        <OpenDuelsFilters
          query={query}
          onQueryChange={(next) => narrow(() => setQuery(next))}
          games={games}
          game={game}
          onGame={(next) => narrow(() => setGame(next))}
          stake={stake}
          onStake={(next) => narrow(() => setStake(next))}
        />
      )}

      {isLoading ? (
        <div aria-hidden="true" className="grid gap-5 split:grid-cols-2 wide:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-[26rem] animate-pulse rounded-3xl bg-paper max-split:not-first:hidden" />
          ))}
        </div>
      ) : duels.length === 0 ? (
        <CreateDuelInvite variant="card" isEmpty />
      ) : cards.length === 0 ? (
        <div className="grid justify-items-start gap-3 rounded-3xl border-2 border-dashed border-line-strong p-[clamp(18px,2.4vw,26px)]">
          <p className="text-ink-2">{t('publicDuels.noMatches')}</p>
          <Button
            variant="paper"
            size="sm"
            onClick={() =>
              narrow(() => {
                setQuery('');
                setGame(null);
                setStake(null);
              })
            }
          >
            {t('lists.clearFilters')}
          </Button>
        </div>
      ) : (
        <div>
          <OpenDuelGrid cards={cards} dealKey={`${game}|${stake}|${normalizedQuery}|${shownPage}`} />
          <Pager page={shownPage} total={shown.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      )}
      {cards.length > 1 && <CreateDuelInvite variant="strip" />}
    </PageColumn>
  );
}
