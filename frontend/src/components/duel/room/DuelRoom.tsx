'use client';

import { usePrivy } from '@privy-io/react-auth';
import { BackLink } from '@/components/duel/room/BackLink';
import { DuelNotFound } from '@/components/duel/room/DuelNotFound';
import { RoomGrid } from '@/components/duel/room/RoomGrid';
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
 * A duel's page: the way back, then the arena with the duel in it, the reader's move under it, and
 * the duel's facts and history. The phase moves on by itself when the time to answer a reported win
 * runs out.
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

  const isMine = authenticated && seatOf(duel, walletAddress) !== null;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-1 pb-18 sm:px-6">
      <BackLink href={isMine ? '/dashboard' : '/duels/public'}>{t(isMine ? 'room.back.mine' : 'room.back.public')}</BackLink>
      <RoomGrid
        duelId={duelId}
        duel={duel}
        phase={phase}
        game={meta ? { name: meta.gameName, category: meta.category } : null}
        inviteSecret={inviteSecret}
        walletAddress={walletAddress}
        isSignedIn={authenticated}
        claimTimeout={claimTimeout}
        refetch={refetch}
      />
    </div>
  );
}
