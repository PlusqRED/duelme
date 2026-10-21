'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import { BackLink } from '@/components/duel/room/BackLink';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';
import { DuelFeed } from '@/components/feed/DuelFeed';
import { GameHead } from '@/components/game/GameHead';
import { GameOpenDuels } from '@/components/game/GameOpenDuels';
import { SectionHead } from '@/components/landing/SectionHead';
import { LostPage } from '@/components/layout/LostPage';
import { PageColumn } from '@/components/layout/PageColumn';
import { Button, buttonVariants } from '@/components/ui/button';
import { useFeedDuels } from '@/hooks/useFeedDuels';
import { useGame } from '@/hooks/useGame';
import { useGameDuels } from '@/hooks/useGameDuels';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { recentDuelsOf } from '@/lib/duelFeed';
import { openPublicDuelsOf } from '@/lib/publicDuelsFilters';

/**
 * A game's own page: its head with the money and duels it has seen, the duels in it waiting for a
 * second player, then every duel someone joined in it, searchable and in pages.
 */
export function GameDetail({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const feedTitleId = useId();
  const { game, isLoading: isGameLoading, isError: isGameError, refetch } = useGame(slug);
  const { duels, metaByDuelId, totalVolume, duelsPlayed, isLoading, isError, retry } = useGameDuels(
    game?.slug,
    DEFAULT_CHAIN_ID
  );
  const open = useMemo(() => openPublicDuelsOf(duels, DEFAULT_CHAIN_ID), [duels]);
  const joined = useMemo(() => recentDuelsOf(duels), [duels]);
  const feed = useFeedDuels(joined, metaByDuelId);
  const [query, setQuery] = useState('');

  if (isGameLoading) {
    return (
      <PageColumn>
        <div aria-hidden="true" className="flex items-center gap-6">
          <div className="size-[clamp(72px,9vw,96px)] animate-pulse rounded-[clamp(20px,2.6vw,28px)] bg-paper" />
          <div className="h-12 w-[min(320px,50%)] animate-pulse rounded-2xl bg-paper" />
        </div>
      </PageColumn>
    );
  }
  if (!game) {
    return isGameError ? (
      <LostPage glyphs={['', '!', '']} title={t('error.title')} text={t('error.text')}>
        <Button variant="navy" onClick={() => void refetch()}>
          {t('action.tryAgain')}
        </Button>
      </LostPage>
    ) : (
      <LostPage glyphs={['4', '0', '4']} title={t('game.notFound')} text={t('game.notFoundText')}>
        <Link href="/games" className={buttonVariants({ variant: 'navy' })}>
          {t('popularGames.viewAll')}
        </Link>
      </LostPage>
    );
  }

  return (
    <PageColumn>
      <BackLink href="/games">{t('nav.games')}</BackLink>
      <GameHead game={game} totalVolume={totalVolume} duelsPlayed={duelsPlayed} isUnknown={isLoading || isError} />
      <PartialDataNotice when={isError} onRetry={retry} />
      <GameOpenDuels gameName={game.name} duels={open} isLoading={isLoading} />
      <section aria-labelledby={feedTitleId}>
        <SectionHead
          titleId={feedTitleId}
          title={t('game.feedTitle', { game: game.name })}
          subtitle={t('game.feedSubtitle')}
        />
        <DuelFeed
          duels={feed}
          isLoading={isLoading}
          query={query}
          onQueryChange={setQuery}
          empty={
            <p className="rounded-3xl border-2 border-dashed border-line-strong p-[clamp(18px,2.4vw,26px)] text-ink-2">
              {t('game.noFeed', { game: game.name })}
            </p>
          }
        />
      </section>
    </PageColumn>
  );
}
