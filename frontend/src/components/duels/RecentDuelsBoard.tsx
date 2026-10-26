'use client';

import { useId, useMemo, useState } from 'react';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';
import { DuelFeed } from '@/components/feed/DuelFeed';
import { PickedGameChip } from '@/components/feed/PickedGameChip';
import { PopularGames } from '@/components/landing/PopularGames';
import { SectionHead } from '@/components/landing/SectionHead';
import { PageColumn } from '@/components/layout/PageColumn';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { useFeedDuels } from '@/hooks/useFeedDuels';
import { useGames } from '@/hooks/useGames';
import { useDuelMetas } from '@/hooks/useDuelMetas';
import { useRecentDuels } from '@/hooks/useRecentDuels';
import { useSearchQuery } from '@/hooks/useSearchQuery';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { popularGames } from '@/lib/landingDuels';

interface RecentDuelsBoardProps {
  /** The search the address came with: a shared link's, or the site's search action's. */
  initialQuery: string;
}

/**
 * Every duel someone joined, newest first, as the landing's rows: those being played, those won and
 * those whose stakes went back, each opening into where its money is. The popular games beside it
 * narrow the list to one game; the search lives in the address.
 */
export function RecentDuelsBoard({ initialQuery }: RecentDuelsBoardProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const { query, setQuery } = useSearchQuery(initialQuery);
  const { duels, isLoading, isError, retry } = useRecentDuels();
  const duelIds = useMemo(() => duels.map((duel) => duel.id), [duels]);
  const { metaByDuelId } = useDuelMetas(duelIds, DEFAULT_CHAIN_ID);
  const feed = useFeedDuels(duels, metaByDuelId);
  const { games, isLoading: isLoadingGames } = useGames();
  const popular = useMemo(() => popularGames(games), [games]);
  const [picked, setPicked] = useState<string | null>(null);
  const shown = useMemo(() => (picked ? feed.filter((duel) => duel.game?.gameSlug === picked) : feed), [feed, picked]);

  return (
    <PageColumn>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 wide:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] wide:grid-rows-[auto_1fr] wide:items-start wide:[grid-template-areas:'head_side'_'main_side']">
        <SectionHead
          isPageTitle
          titleId={titleId}
          title={t('recent.title')}
          subtitle={t('recent.pageSubtitle')}
          className="wide:[grid-area:head]"
        />
        <PopularGames
          games={popular}
          isLoading={isLoadingGames}
          picked={picked}
          onPick={(slug) => setPicked(picked === slug ? null : slug)}
          className="max-wide:mb-5 wide:sticky wide:top-24 wide:pt-2 wide:[grid-area:side]"
        />
        <section aria-labelledby={titleId} className="grid wide:[grid-area:main]">
          <PartialDataNotice when={isError} onRetry={retry} />
          <PickedGameChip game={popular.find((game) => game.slug === picked)} onClear={() => setPicked(null)} />
          <DuelFeed
            duels={shown}
            isLoading={isLoading}
            query={query}
            onQueryChange={setQuery}
            scope={picked ?? ''}
            empty={
              <div className="grid justify-items-start gap-1 rounded-3xl border-2 border-dashed border-line-strong p-[clamp(18px,2.4vw,26px)]">
                <p className="text-ink-2">{t('recent.noActivity')}</p>
                <LocaleLink href="/duels/public" className="link inline-flex min-h-11 items-center">
                  {t('recent.seeOpen')}
                </LocaleLink>
              </div>
            }
          />
        </section>
      </div>
    </PageColumn>
  );
}
