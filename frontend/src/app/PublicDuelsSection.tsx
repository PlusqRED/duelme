'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';
import { PublicDuelCard } from '@/components/duel/PublicDuelCard';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { usePublicDuels } from '@/hooks/usePublicDuels';
import { usePublicDuelMetas } from '@/hooks/usePublicDuelMetas';
import { useNicknames } from '@/hooks/useNicknames';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { enrichPublicDuel, type EnrichedDuel } from '@/lib/publicDuelsFilters';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

export function PublicDuelsSection() {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const { authenticated } = usePrivy();
  const { walletAddress } = useActiveWallet();
  const { duels, isLoading, isError } = usePublicDuels();
  const viewerAddress = authenticated ? walletAddress : undefined;
  const isViewerIdentityPending = authenticated && !walletAddress;

  const preview = useMemo(() => duels.slice(0, 6), [duels]);
  const duelIds = useMemo(() => preview.map((d) => d.id), [preview]);
  const addresses = useMemo(() => preview.map((d) => d.creator), [preview]);

  const { metaByDuelId } = usePublicDuelMetas(duelIds, DEFAULT_CHAIN_ID);
  const { resolveDisplay } = useNicknames(addresses);
  const { reputationByAddress, reputationStatsByAddress } = useReputationLevels(addresses, DEFAULT_CHAIN_ID);
  const enrichedPreview = useMemo<EnrichedDuel[]>(
    () => preview.map((duel) => enrichPublicDuel({
      duel,
      meta: metaByDuelId[duel.id],
      resolveDisplay,
      reputationByAddress,
      reputationStatsByAddress,
    })),
    [preview, metaByDuelId, resolveDisplay, reputationByAddress, reputationStatsByAddress],
  );

  return (
    <section id="public-duels" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <PartialDataNotice when={isError} />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('publicDuels.title')}</h2>
          <p className="mt-2 max-w-2xl text-slate-500">{t('publicDuels.subtitle')}</p>
        </div>
        {!isLoading && enrichedPreview.length > 0 && (
          <Link
            href="/duels/public"
            className="hidden items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 sm:flex"
          >
            {t('publicDuels.viewAll')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[22rem] animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80"
            />
          ))}
        </div>
      ) : enrichedPreview.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrichedPreview.map((duel) => (
              <PublicDuelCard
                key={duel.id}
                duel={duel}
                timeAgo={timeAgo}
                variant="compact"
                viewerAddress={viewerAddress}
                isViewerIdentityPending={isViewerIdentityPending}
              />
            ))}
          </div>
          <div className="mt-6 text-center sm:hidden">
            <Link href="/duels/public" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              {t('publicDuels.viewAll')} {'->'}
            </Link>
          </div>
        </>
      ) : (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
            {t('publicDuels.empty')}
          </p>
          <div className="mt-6">
            <Link
              href="/duel/create"
              className={buttonVariants({
                size: 'lg',
                className: 'rounded-2xl bg-slate-950 px-8 text-white hover:bg-slate-900',
              })}
            >
              {t('hero.cta')}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
