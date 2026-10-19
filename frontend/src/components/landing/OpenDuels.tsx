'use client';

import Link from 'next/link';
import { useCallback, useId } from 'react';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';
import { CreateDuelInvite } from '@/components/landing/CreateDuelInvite';
import { OpenDuelCard } from '@/components/landing/OpenDuelCard';
import { OpenDuelsLobby } from '@/components/landing/OpenDuelsLobby';
import { Chip } from '@/components/ui/chip';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useOpenDuels } from '@/hooks/useOpenDuels';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { useTranslation } from '@/i18n/useTranslation';
import { isLobby } from '@/lib/landingDuels';
import { LANDING_SECTION_IDS } from '@/lib/navigation';
import type { EnrichedDuel } from '@/lib/publicDuelsFilters';
import { usePrivy } from '@privy-io/react-auth';

/**
 * The landing's open public duels, with how many are open in all: one gets a wide card beside the
 * invitation to make your own, two or more a lobby, none just the invitation.
 */
export function OpenDuels() {
  const { t } = useTranslation();
  const titleId = useId();
  const timeAgo = useTimeAgo();
  const { authenticated } = usePrivy();
  const { walletAddress } = useActiveWallet();
  const { duels, total, isLoading, isError, retry } = useOpenDuels();
  // Until a signed-in reader's wallet is known, their own duel cannot be told apart: open, not join.
  const isOwn = useCallback(
    (duel: EnrichedDuel) => authenticated && (!walletAddress || walletAddress === duel.creator.toLowerCase()),
    [authenticated, walletAddress]
  );

  return (
    <section
      id={LANDING_SECTION_IDS.publicDuels}
      aria-labelledby={titleId}
      className="mx-auto w-full max-w-page px-gutter pt-section"
    >
      <div className="mb-[clamp(24px,3vw,40px)] grid max-w-[780px] gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id={titleId} className="text-h2">
            {t('publicDuels.title')}
          </h2>
          {total > 0 && (
            <Chip className="h-8 gap-2 bg-blue-soft pr-[13px] pl-[11px] text-sm font-bold text-blue-deep before:size-2 before:animate-breathe before:rounded-full before:bg-blue before:opacity-40">
              {t('publicDuels.openNow', { n: total })}
            </Chip>
          )}
        </div>
        <p className="max-w-[60ch] text-lg text-ink-2">{t('publicDuels.subtitle')}</p>
        <Link href="/duels/public" className="link inline-flex min-h-11 items-center justify-self-start">
          {t('publicDuels.viewAll')}
        </Link>
      </div>

      <PartialDataNotice when={isError} onRetry={retry} />
      {isLoading ? (
        <div aria-hidden="true" className="grid gap-5 split:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="h-[26rem] animate-pulse rounded-3xl bg-paper" />
          <div className="h-[26rem] animate-pulse rounded-3xl bg-canvas-deep max-split:hidden" />
        </div>
      ) : isLobby(duels.length) ? (
        <OpenDuelsLobby duels={duels} isOwn={isOwn} timeAgo={timeAgo} />
      ) : (
        <div className="grid gap-5 split:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {duels.map((duel) => (
            <OpenDuelCard key={duel.id} duel={duel} isCompact={false} isOwn={isOwn(duel)} timeAgo={timeAgo} />
          ))}
          <CreateDuelInvite variant="card" isEmpty={duels.length === 0} className="only:col-span-full" />
        </div>
      )}
    </section>
  );
}
