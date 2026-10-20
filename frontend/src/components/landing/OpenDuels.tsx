'use client';

import Link from 'next/link';
import { useId } from 'react';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';
import { OpenNowChip } from '@/components/duels/OpenNowChip';
import { CreateDuelInvite } from '@/components/landing/CreateDuelInvite';
import { OpenDuelCard } from '@/components/landing/OpenDuelCard';
import { OpenDuelsLobby } from '@/components/landing/OpenDuelsLobby';
import { SectionHead } from '@/components/landing/SectionHead';
import { useIsOwnDuel } from '@/hooks/useIsOwnDuel';
import { useOpenDuels } from '@/hooks/useOpenDuels';
import { useTranslation } from '@/i18n/useTranslation';
import { isLobby } from '@/lib/landingDuels';
import { LANDING_SECTION_IDS } from '@/lib/navigation';

/** One open duel beside the invitation on a wide screen, under it on a narrow one; the same while loading. */
export const SINGLE_LAYOUT = 'grid gap-5 split:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]';

/**
 * The landing's open public duels, with how many are open in all: one gets a wide card beside the
 * invitation to make your own, two or more a lobby, none just the invitation.
 */
export function OpenDuels() {
  const { t } = useTranslation();
  const titleId = useId();
  const isOwn = useIsOwnDuel();
  const { duels, total, isLoading, isError, retry } = useOpenDuels();

  return (
    <section
      id={LANDING_SECTION_IDS.publicDuels}
      aria-labelledby={titleId}
      className="mx-auto w-full max-w-page px-gutter pt-section"
    >
      <SectionHead
        titleId={titleId}
        title={t('publicDuels.title')}
        subtitle={t('publicDuels.subtitle')}
        badge={<OpenNowChip count={total} />}
      >
        <Link href="/duels/public" className="link inline-flex min-h-11 items-center justify-self-start">
          {t('publicDuels.viewAll')}
        </Link>
      </SectionHead>

      <PartialDataNotice when={isError} onRetry={retry} />
      {isLoading ? (
        <div aria-hidden="true" className={SINGLE_LAYOUT}>
          <div className="h-[26rem] animate-pulse rounded-3xl bg-paper" />
          <div className="h-[26rem] animate-pulse rounded-3xl bg-canvas-deep max-split:hidden" />
        </div>
      ) : isLobby(duels.length) ? (
        <OpenDuelsLobby duels={duels} isOwn={isOwn} />
      ) : (
        <div className={SINGLE_LAYOUT}>
          {duels.map((duel) => (
            <OpenDuelCard key={duel.id} duel={duel} isCompact={false} isOwn={isOwn(duel)} />
          ))}
          <CreateDuelInvite variant="card" isEmpty={duels.length === 0} className="only:col-span-full" />
        </div>
      )}
    </section>
  );
}
