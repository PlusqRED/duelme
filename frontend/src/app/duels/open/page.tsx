'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOpenDuels } from '@/hooks/useOpenDuels';
import { useNicknames } from '@/hooks/useNicknames';
import { useTranslation } from '@/i18n/useTranslation';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { truncateUnicode } from '@/lib/duel';
import { Globe, Search } from 'lucide-react';

const PAGE_SIZE = 20;

export default function OpenDuelsPage() {
  const { t } = useTranslation();
  const { duels, isLoading } = useOpenDuels();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const addresses = useMemo(
    () => duels.map((d) => d.creator),
    [duels],
  );
  const { resolveDisplay } = useNicknames(addresses);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filtered = useMemo(
    () => duels.filter((d) => {
      if (!normalizedSearch) return true;
      const creatorDisplay = resolveDisplay(d.creator).toLowerCase();
      const wagerStr = String(d.wager);
      const msg = d.message.toLowerCase();
      return creatorDisplay.includes(normalizedSearch)
        || d.creator.toLowerCase().includes(normalizedSearch)
        || wagerStr.includes(normalizedSearch)
        || msg.includes(normalizedSearch);
    }),
    [duels, normalizedSearch, resolveDisplay],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('openDuels.title')}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t('openDuels.subtitle')}
        </p>
      </div>

      {duels.length > 0 && (
        <div className="mb-6 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('game.searchPlaceholder')}
            className="h-11 border-slate-200 bg-white pl-10"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white py-16">
            <Globe className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              {searchQuery ? t('dashboard.noMatches') : t('openDuels.empty')}
            </p>
            {!searchQuery && (
              <Link href="/duel/create">
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
                  {t('hero.cta')}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          paginated.map((duel) => (
            <Link
              key={duel.id}
              href={`/duel/${duel.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 transition-all hover:border-indigo-200 hover:shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {duel.wager} USDT
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                    <Globe className="h-2.5 w-2.5" />
                    {t('duel.public')}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {t('duel.createdBy')} {resolveDisplay(duel.creator)}
                </span>
                {hasVisibleDuelMessage(duel.message) && (
                  <span className="text-xs text-slate-400 italic">
                    &ldquo;{truncateUnicode(duel.message, 40)}&rdquo;
                  </span>
                )}
              </div>
              <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 shrink-0">
                {t('action.join')}
              </Button>
            </Link>
          ))
        )}
      </div>

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
