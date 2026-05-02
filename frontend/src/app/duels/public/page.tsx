'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { PublicDuelCard } from '@/components/duel/PublicDuelCard';
import { PublicDuelsFiltersPanel } from '@/components/duel/PublicDuelsFiltersPanel';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { usePublicDuels } from '@/hooks/usePublicDuels';
import { usePublicDuelMetas } from '@/hooks/usePublicDuelMetas';
import { useNicknames } from '@/hooks/useNicknames';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import {
  NO_GAME_FILTER,
  WAGER_RANGES,
  enrichPublicDuel,
  formatPublicDuelAmount,
  type SortBy, type WagerRange, type EnrichedDuel,
} from '@/lib/publicDuelsFilters';
import { usePrivy } from '@privy-io/react-auth';
import { Globe2 } from 'lucide-react';

const PAGE_SIZE = 20;

export default function PublicDuelsPage() {
  const { t, language } = useTranslation();
  const timeAgo = useTimeAgo();
  const { authenticated } = usePrivy();
  const { walletAddress } = useActiveWallet();
  const { duels, isLoading } = usePublicDuels();
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [wagerRange, setWagerRange] = useState<WagerRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [page, setPage] = useState(1);

  const searchParams = useSearchParams();
  const playerFilter = searchParams.get('player')?.toLowerCase() ?? null;

  const duelIds = useMemo(() => duels.map((d) => d.id), [duels]);
  const { metaByDuelId } = usePublicDuelMetas(duelIds, DEFAULT_CHAIN_ID);

  const addresses = useMemo(() => duels.map((d) => d.creator), [duels]);
  const { resolveDisplay } = useNicknames(addresses);
  const { reputationByAddress, reputationStatsByAddress } = useReputationLevels(addresses, DEFAULT_CHAIN_ID);

  const enriched = useMemo<EnrichedDuel[]>(
    () => duels.map((duel) => enrichPublicDuel({
      duel,
      meta: metaByDuelId[duel.id],
      resolveDisplay,
      reputationByAddress,
      reputationStatsByAddress,
    })),
    [duels, metaByDuelId, resolveDisplay, reputationByAddress, reputationStatsByAddress],
  );

  const gameOptions = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const d of enriched) {
      if (!d.gameName) continue;
      const existing = map.get(d.gameName);
      map.set(d.gameName, { name: d.gameName, count: (existing?.count ?? 0) + 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [enriched]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    let result = enriched;

    if (playerFilter) {
      result = result.filter((d) => d.creator.toLowerCase() === playerFilter);
    }

    if (gameFilter === NO_GAME_FILTER) {
      result = result.filter((d) => !d.gameName);
    } else if (gameFilter) {
      result = result.filter((d) => d.gameName === gameFilter);
    }

    if (wagerRange !== 'all') {
      const range = WAGER_RANGES.find((r) => r.key === wagerRange);
      if (range) result = result.filter((d) => range.test(d.wager));
    }

    if (normalizedSearch) {
      result = result.filter((d) => {
        const hay = [
          d.creatorName, d.creator, String(d.wager),
          d.message, d.gameName ?? '', d.gameCategory ?? '',
          d.reputation ?? '',
          String(d.reputationStats?.honored ?? ''),
          String(d.reputationStats?.total ?? ''),
        ].join(' ').toLowerCase();
        return hay.includes(normalizedSearch);
      });
    }

    result = [...result];
    if (sortBy === 'newest') result.sort((a, b) => Number(b.createdAt - a.createdAt));
    else if (sortBy === 'highest') result.sort((a, b) => b.wager - a.wager);
    else result.sort((a, b) => a.wager - b.wager);

    return result;
  }, [enriched, playerFilter, gameFilter, wagerRange, normalizedSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalUsdt = useMemo(
    () => duels.reduce((sum, d) => sum + d.wager, 0),
    [duels],
  );
  const gameCount = gameOptions.length;

  function resetFilters() {
    setSearchQuery('');
    setGameFilter(null);
    setWagerRange('all');
    setSortBy('newest');
    setPage(1);
  }

  const hasActiveFilters = !!gameFilter || wagerRange !== 'all' || !!normalizedSearch;
  const totalUsdtLabel = `${formatPublicDuelAmount(totalUsdt, language)} USDT`;
  const viewerAddress = authenticated ? walletAddress : undefined;
  const isViewerIdentityPending = authenticated && !walletAddress;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      <section className="border-b border-slate-200 bg-slate-50 bg-dots">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {t('publicDuels.title')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
                {t('publicDuels.dedicatedSubtitle')}
              </p>
            </div>

            {duels.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:min-w-[24rem]">
                <HeaderStat label={t('publicDuels.totalOpen')} value={duels.length.toString()} />
                <HeaderStat label={t('publicDuels.totalWager')} value={totalUsdtLabel} />
                <HeaderStat label={t('publicDuels.gamesLive')} value={gameCount.toString()} />
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {duels.length > 0 && (
          <PublicDuelsFiltersPanel
            searchQuery={searchQuery}
            gameOptions={gameOptions}
            gameFilter={gameFilter}
            wagerRange={wagerRange}
            sortBy={sortBy}
            onSearchChange={(value) => {
              setSearchQuery(value);
              setPage(1);
            }}
            onGameFilterChange={(value) => {
              setGameFilter(value);
              setPage(1);
            }}
            onWagerRangeChange={(value) => {
              setWagerRange(value);
              setPage(1);
            }}
            onSortChange={(value) => {
              setSortBy(value);
              setPage(1);
            }}
          />
        )}

        {playerFilter && (
          <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
            Filtering by player: <span className="font-mono">{playerFilter.slice(0, 6)}...{playerFilter.slice(-4)}</span>{' '}
            <Link href="/duels/public" className="ml-2 underline">Clear</Link>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[24rem] animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80"
              />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-16 text-center">
            <Globe2 className="h-10 w-10 text-slate-300" />
            <p className="max-w-md text-sm leading-relaxed text-slate-500">
              {hasActiveFilters ? t('dashboard.noMatches') : t('publicDuels.empty')}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                {t('dashboard.clearSearch')}
              </Button>
            ) : (
              <Link
                href="/duel/create"
                className={buttonVariants({
                  className: 'bg-slate-950 text-white hover:bg-slate-800',
                })}
              >
                {t('hero.cta')}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginated.map((duel) => (
              <PublicDuelCard
                key={duel.id}
                duel={duel}
                timeAgo={timeAgo}
                viewerAddress={viewerAddress}
                isViewerIdentityPending={isViewerIdentityPending}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row">
            <span>{t('dashboard.pageSummary', { current: safePage, total: totalPages })}</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                {t('action.previous')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                {t('action.next')}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
      <p className="truncate text-[10px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900 sm:text-base">{value}</p>
    </div>
  );
}
