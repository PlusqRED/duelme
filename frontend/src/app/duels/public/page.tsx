'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OpenDuelCard } from '@/components/duel/OpenDuelCard';
import { useOpenDuels } from '@/hooks/useOpenDuels';
import { useOpenDuelMetas } from '@/hooks/useOpenDuelMetas';
import { useNicknames } from '@/hooks/useNicknames';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { useTranslation } from '@/i18n/useTranslation';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import {
  WAGER_RANGES, WAGER_LABELS,
  type SortBy, type WagerRange, type EnrichedDuel,
} from '@/lib/openDuelsFilters';
import type { TranslationKey } from '@/i18n/translations';
import { Globe, Search, Gamepad2, ArrowUpDown, Swords } from 'lucide-react';

const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.arbitrumSepolia.id;
const PAGE_SIZE = 20;

export default function OpenDuelsPage() {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const { duels, isLoading } = useOpenDuels();
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [wagerRange, setWagerRange] = useState<WagerRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [page, setPage] = useState(1);

  const duelIds = useMemo(() => duels.map((d) => d.id), [duels]);
  const { metaByDuelId } = useOpenDuelMetas(duelIds, DEFAULT_CHAIN_ID);

  const addresses = useMemo(() => duels.map((d) => d.creator), [duels]);
  const { resolveDisplay } = useNicknames(addresses);
  const { reputationByAddress } = useReputationLevels(addresses, DEFAULT_CHAIN_ID);

  const enriched = useMemo<EnrichedDuel[]>(
    () => duels.map((d) => {
      const meta = metaByDuelId[d.id];
      return {
        id: d.id,
        creator: d.creator,
        wager: d.wager,
        message: d.message,
        createdAt: d.createdAt,
        chainId: d.chainId,
        gameName: meta?.gameName ?? null,
        gameCategory: meta?.category ?? null,
        creatorName: resolveDisplay(d.creator),
        reputation: reputationByAddress[d.creator.toLowerCase()],
      };
    }),
    [duels, metaByDuelId, resolveDisplay, reputationByAddress],
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

    if (gameFilter === '__none__') {
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
        ].join(' ').toLowerCase();
        return hay.includes(normalizedSearch);
      });
    }

    result = [...result];
    if (sortBy === 'newest') result.sort((a, b) => Number(b.createdAt - a.createdAt));
    else if (sortBy === 'highest') result.sort((a, b) => b.wager - a.wager);
    else result.sort((a, b) => a.wager - b.wager);

    return result;
  }, [enriched, gameFilter, wagerRange, normalizedSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalUsdt = useMemo(
    () => duels.reduce((sum, d) => sum + d.wager, 0),
    [duels],
  );

  function resetFilters() {
    setSearchQuery('');
    setGameFilter(null);
    setWagerRange('all');
    setSortBy('newest');
    setPage(1);
  }

  const hasActiveFilters = !!gameFilter || wagerRange !== 'all' || !!normalizedSearch;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('openDuels.title')}
        </h1>
        {duels.length > 0 && (
          <p className="mt-1 text-sm text-slate-500">
            {t('openDuels.stats', { count: duels.length, total: totalUsdt.toFixed(0) })}
          </p>
        )}
      </div>

      {/* Search */}
      {duels.length > 0 && (
        <div className="mb-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder={t('openDuels.searchPlaceholder')}
            className="h-11 border-slate-200 bg-white pl-10"
          />
        </div>
      )}

      {/* Filters */}
      {duels.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {/* Game pills */}
          {gameOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Gamepad2 className="h-3.5 w-3.5 text-slate-400 mr-1" />
              <button
                onClick={() => { setGameFilter(null); setPage(1); }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  !gameFilter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('openDuels.allGames')}
              </button>
              {gameOptions.map((g) => (
                <button
                  key={g.name}
                  onClick={() => { setGameFilter(gameFilter === g.name ? null : g.name); setPage(1); }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    gameFilter === g.name ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {g.name}
                  <span className="ml-1 opacity-60">{g.count}</span>
                </button>
              ))}
              <button
                onClick={() => { setGameFilter(gameFilter === '__none__' ? null : '__none__'); setPage(1); }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  gameFilter === '__none__' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('openDuels.noGame')}
              </button>
            </div>
          )}

          {/* Wager range + sort */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-slate-400 mr-1" />
              {WAGER_RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => { setWagerRange(wagerRange === r.key ? 'all' : r.key); setPage(1); }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    wagerRange === r.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r.key === 'all' ? t('openDuels.allWagers') : WAGER_LABELS[r.key]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              {(['newest', 'highest', 'lowest'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSortBy(s); setPage(1); }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    sortBy === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {t(`openDuels.sort${s.charAt(0).toUpperCase() + s.slice(1)}` as TranslationKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Duel list */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white py-16">
            <Globe className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              {hasActiveFilters ? t('dashboard.noMatches') : t('openDuels.empty')}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                {t('dashboard.clearSearch')}
              </Button>
            ) : (
              <Link href="/duel/create">
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
                  {t('hero.cta')}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          paginated.map((duel) => (
            <OpenDuelCard key={duel.id} duel={duel} timeAgo={timeAgo} />
          ))
        )}
      </div>

      {/* Pagination */}
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
    </div>
  );
}
