'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { DashboardInvite } from '@/components/dashboard/DashboardInvite';
import { DashboardSkeleton, StandingSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DuelBoard } from '@/components/dashboard/DuelBoard';
import { History } from '@/components/dashboard/History';
import { StandingCard } from '@/components/dashboard/StandingCard';
import { TakeFlowDialog } from '@/components/dashboard/TakeFlowDialog';
import { TakenLine } from '@/components/dashboard/TakenLine';
import { TakeSafe } from '@/components/dashboard/TakeSafe';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardTake } from '@/hooks/useDashboardTake';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * My duels, under the page's title: an invitation to sign in for a guest, and for a player their
 * duels read from the contract, with their card beside them.
 */
export function Dashboard() {
  const { t } = useTranslation();
  const { ready, authenticated, login } = usePrivy();
  const { activeWallet, walletAddress } = useActiveWallet();

  if (ready && !authenticated) {
    return (
      <DeskLayout
        main={
          <DashboardInvite
            title={t('dash.guest.title')}
            text={t('dash.guest.text')}
            action={
              <Button size="lg" onClick={() => login()}>
                <Icon name="login" />
                {t('nav.connectWallet')}
              </Button>
            }
          />
        }
      />
    );
  }
  // Signed in, the wallet can still be on its way; the page waits for it as for the duels.
  if (!activeWallet || !walletAddress) return <Loading />;
  return <PlayerDesk address={activeWallet.address} walletAddress={walletAddress} />;
}

function PlayerDesk({ address, walletAddress }: { address: string; walletAddress: `0x${string}` }) {
  const { t } = useTranslation();
  const desk = useDashboard(walletAddress);
  const { owed, takenRaw, take, actionFlow } = useDashboardTake(desk.owed, desk.refetch);
  const owedById = new Map((owed?.items ?? []).map((item) => [item.duelId, item]));
  const standing = <StandingCard address={address} walletAddress={walletAddress} totals={desk.totals} />;
  const notice = desk.isError && (
    // The board's gap spaces the notice, as it does every other part.
    <div className="*:mb-0">
      <PartialDataNotice when onRetry={() => void desk.retry()} />
    </div>
  );

  return (
    <>
      {/* One status the whole time, so that what it says is read out when it changes. */}
      <p role="status" className="sr-only">
        {desk.isLoading ? t('dash.loading') : ''}
      </p>
      {desk.isLoading ? (
        <DeskLayout main={<DashboardSkeleton />} side={<StandingSkeleton />} />
      ) : !desk.hasDuels ? (
        <DeskLayout
          main={
            <>
              {notice}
              <DashboardInvite
                title={t('dash.empty.title')}
                text={t('dash.empty.text')}
                action={
                  <Link href="/duel/create" className={buttonVariants({ size: 'lg' })}>
                    <Icon name="plus" />
                    {t('hero.cta')}
                  </Link>
                }
              />
            </>
          }
          side={standing}
        />
      ) : (
        <DeskLayout
          main={
            <>
              {notice}
              {owed && owed.items.length > 0 ? (
                <TakeSafe
                  owed={owed}
                  entryById={desk.entryById}
                  gameOf={desk.gameOf}
                  nameOf={desk.nameOf}
                  onTake={take}
                  isBusy={actionFlow.flow !== null}
                />
              ) : (
                takenRaw !== null && <TakenLine raw={takenRaw} isSettled={actionFlow.flow === null} />
              )}
              {desk.yours.length > 0 && (
                <DuelBoard
                  title={t('dash.move.title')}
                  isLive
                  entries={desk.yours}
                  gameOf={desk.gameOf}
                  nameOf={desk.nameOf}
                  claimTimeout={desk.claimTimeout}
                  orderFrom={0}
                />
              )}
              {desk.theirs.length > 0 && (
                <DuelBoard
                  title={t('dash.wait.title')}
                  isLive={false}
                  entries={desk.theirs}
                  gameOf={desk.gameOf}
                  nameOf={desk.nameOf}
                  claimTimeout={desk.claimTimeout}
                  orderFrom={desk.yours.length}
                />
              )}
              {desk.past.length > 0 && <History past={desk.past} gameOf={desk.gameOf} nameOf={desk.nameOf} owedById={owedById} />}
            </>
          }
          side={standing}
        />
      )}
      <TakeFlowDialog actionFlow={actionFlow} />
    </>
  );
}

/** Before the wallet is known: the page's shape, and the same words the player's desk reads out. */
function Loading() {
  const { t } = useTranslation();

  return (
    <>
      <p role="status" className="sr-only">
        {t('dash.loading')}
      </p>
      <DeskLayout main={<DashboardSkeleton />} side={<StandingSkeleton />} />
    </>
  );
}

/**
 * The duels and, from 1080px, the player's card in a column of its own that stays in view; under
 * that the card follows the duels. The duels' column is the container the cards and rows fit to.
 */
function DeskLayout({ main, side }: { main: ReactNode; side?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7 hero:grid-cols-[minmax(0,1fr)_340px] hero:items-start">
      <div className="@container/desk grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-9">{main}</div>
      {side && <aside className="min-w-0 hero:sticky hero:top-[92px]">{side}</aside>}
    </div>
  );
}
