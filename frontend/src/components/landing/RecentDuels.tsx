'use client';

import Link from 'next/link';
import { useId, useMemo, useRef, useState } from 'react';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';
import { DuelRow } from '@/components/feed/DuelRow';
import { PickedGameChip } from '@/components/feed/PickedGameChip';
import { PopularGames } from '@/components/landing/PopularGames';
import { SectionHead } from '@/components/landing/SectionHead';
import { LEAVE_MS, useGameFilter } from '@/hooks/useGameFilter';
import { useGames } from '@/hooks/useGames';
import { useListReflow } from '@/hooks/useListReflow';
import { useWonDuels } from '@/hooks/useWonDuels';
import { useTranslation } from '@/i18n/useTranslation';
import { popularGames } from '@/lib/landingDuels';
import { LANDING_SECTION_IDS } from '@/lib/navigation';

/**
 * The latest duels that ended with a winner paid, beside the games played most, which filter them:
 * pick one and the other rows step out while the rest slide into place. Below a wide screen the
 * games are a strip above the list. A row opens into the receipt of where its money went, one at a
 * time.
 */
export function RecentDuels() {
  const { t } = useTranslation();
  const titleId = useId();
  const { games, isLoading: isLoadingGames } = useGames();
  const popular = useMemo(() => popularGames(games), [games]);
  const filter = useGameFilter();
  const { results, hasAny, isLoading, isError, retry } = useWonDuels(filter.shown, filter.picked);
  const [openId, setOpenId] = useState<number | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const reflow = useListReflow(listRef, filter.shown);

  const pickedGame = popular.find((game) => game.slug === filter.picked);
  const shownGame = popular.find((game) => game.slug === filter.shown);

  function pick(slug: string | null) {
    reflow.capture();
    const next = filter.pick(slug);
    const open = results.find((duel) => duel.id === openId);
    if (next !== null && open?.game?.gameSlug !== next) {
      setOpenId(null);
    }
  }

  return (
    <section
      id={LANDING_SECTION_IDS.recentDuels}
      aria-labelledby={titleId}
      className="mx-auto w-full max-w-page px-gutter pt-section"
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 wide:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] wide:grid-rows-[auto_1fr] wide:items-start wide:[grid-template-areas:'head_side'_'main_side']">
        <SectionHead
          titleId={titleId}
          title={t('recent.title')}
          subtitle={t('recent.subtitle')}
          className="wide:[grid-area:head]"
        />

        <PopularGames
          games={popular}
          isLoading={isLoadingGames}
          picked={filter.picked}
          onPick={pick}
          className="max-wide:mb-5 wide:sticky wide:top-24 wide:pt-2 wide:[grid-area:side]"
        />

        <div className="grid wide:[grid-area:main]">
          <PartialDataNotice when={isError} onRetry={retry} />
          <PickedGameChip game={pickedGame} onClear={() => pick(null)} />
          <ol
            ref={listRef}
            style={{ '--leave': `${LEAVE_MS}ms` }}
            className="relative rounded-3xl border border-line bg-paper p-1"
          >
            {isLoading &&
              [0, 1, 2].map((index) => (
                <li key={index} aria-hidden="true" className="m-1 h-[88px] animate-pulse rounded-[20px] bg-canvas" />
              ))}
            {results.map((duel) => (
              <DuelRow
                key={duel.id}
                duel={duel}
                isOpen={openId === duel.id}
                onToggle={() => setOpenId(openId === duel.id ? null : duel.id)}
                isLeaving={filter.isLeaving && duel.game?.gameSlug !== filter.picked}
              />
            ))}
            {!isLoading && !isError && results.length === 0 && (
              <li data-key="none" className="grid justify-items-start gap-0.5 px-[18px] pt-[18px] pb-2 text-ink-2">
                {shownGame && hasAny ? (
                  <>
                    <p>{t('recent.none', { game: shownGame.name })}</p>
                    <a href={`#${LANDING_SECTION_IDS.publicDuels}`} className="link inline-flex min-h-11 items-center">
                      {t('recent.seeOpen')}
                    </a>
                  </>
                ) : (
                  <p className="pb-2.5">{t('recent.noActivity')}</p>
                )}
              </li>
            )}
          </ol>
          <Link href="/duels/recent" className="link mt-2 inline-flex min-h-11 items-center justify-self-start">
            {t('recent.viewAll')}
          </Link>
        </div>
      </div>
    </section>
  );
}
