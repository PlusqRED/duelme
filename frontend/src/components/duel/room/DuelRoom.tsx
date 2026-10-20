'use client';

import { usePrivy } from '@privy-io/react-auth';
import { BackLink } from '@/components/duel/room/BackLink';
import { DuelActions } from '@/components/duel/room/DuelActions';
import { DuelArena } from '@/components/duel/room/DuelArena';
import { DuelNotFound } from '@/components/duel/room/DuelNotFound';
import { DuelTimeline } from '@/components/duel/room/DuelTimeline';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useContractConfig } from '@/hooks/useContractConfig';
import { useDuel } from '@/hooks/useDuel';
import { useDuelInvite } from '@/hooks/useDuelInvite';
import { useDuelMeta } from '@/hooks/useDuelMeta';
import { useClockValue } from '@/hooks/useNow';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import { seatOf } from '@/lib/duel';
import { duelPhase } from '@/lib/duelPhase';

/**
 * A duel's page: the arena with the duel in it, what the reader can do, and its timeline beside
 * them on a wide screen. The phase moves on by itself when the time to answer a reported win runs
 * out; nothing else here follows the clock.
 */
export function DuelRoom({ duelId }: { duelId: number }) {
  const { t } = useTranslation();
  const { claimTimeout } = useContractConfig();
  const { authenticated } = usePrivy();
  const { walletAddress } = useActiveWallet();
  const { duel, isLoading, isError, refetch } = useDuel(BigInt(duelId), DEFAULT_CHAIN_ID);
  const inviteSecret = useDuelInvite(duelId, duel?.creator, walletAddress);
  const { meta } = useDuelMeta(duelId, DEFAULT_CHAIN_ID);
  const isIssued = !!duel && duel.state !== DuelState.Nonexistent;
  const phase = useClockValue((now) => (duel && isIssued ? duelPhase(duel, now, claimTimeout) : null));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="size-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
      </div>
    );
  }
  if (isError || !duel || !phase) {
    return <DuelNotFound />;
  }

  const viewerSide = seatOf(duel, walletAddress);
  const isMine = authenticated && viewerSide !== null;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-1 pb-18 sm:px-6">
      <BackLink href={isMine ? '/dashboard' : '/duels/public'}>{t(isMine ? 'room.back.mine' : 'room.back.public')}</BackLink>
      <div className="grid grid-cols-1 gap-5 min-[1080px]:grid-cols-[minmax(0,1fr)_340px] min-[1080px]:items-start min-[1080px]:gap-7">
        <div className="grid min-w-0 content-start gap-4">
          <DuelArena
            duelId={duelId}
            duel={duel}
            phase={phase}
            viewerSide={viewerSide}
            chainId={DEFAULT_CHAIN_ID}
            claimTimeout={claimTimeout}
            game={meta ? { name: meta.gameName, category: meta.category } : null}
          />
          <DuelActions duelId={duelId} duel={duel} inviteSecret={inviteSecret} walletAddress={walletAddress} refetch={refetch} />
        </div>
        <aside className="grid min-w-0 content-start gap-5 min-[1080px]:sticky min-[1080px]:top-[92px]">
          <DuelTimeline duel={duel} phase={phase} claimTimeout={claimTimeout} />
        </aside>
      </div>
    </div>
  );
}
