'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNicknames } from '@/hooks/useNicknames';
import { usePublicDuelMetas } from '@/hooks/usePublicDuelMetas';
import { useRecentDuels } from '@/hooks/useRecentDuels';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { PartialDataNotice } from '../PartialDataNotice';
import { RecentDuelsGrid } from './RecentDuelsGrid';

const LANDING_TEASER_LIMIT = 6;

export function RecentDuelsTeaser() {
  const { t } = useTranslation();
  const { duels, isLoading, isError } = useRecentDuels();

  const visibleDuels = useMemo(
    () => duels.slice(0, LANDING_TEASER_LIMIT),
    [duels],
  );

  const duelIds = useMemo(() => visibleDuels.map((d) => d.id), [visibleDuels]);
  const addresses = useMemo(
    () => visibleDuels.flatMap((d) => [d.player1, d.player2]),
    [visibleDuels],
  );

  const { metaByDuelId } = usePublicDuelMetas(duelIds, DEFAULT_CHAIN_ID);
  const { resolveDisplay, nicknameByAddress } = useNicknames(addresses);

  return (
    <div className="w-full">
      <PartialDataNotice when={isError} />
      <RecentDuelsGrid
        duels={visibleDuels}
        isLoading={isLoading}
        metaByDuelId={metaByDuelId}
        resolveDisplay={resolveDisplay}
        nicknameByAddress={nicknameByAddress}
      />

      {duels.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Link
            href="/duels/recent"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md"
          >
            {t('recent.viewAll')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
