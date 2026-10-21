'use client';

import { useMemo, useRef, useState } from 'react';
import { DuelArena } from '@/components/duel/room/DuelArena';
import { DuelHistory } from '@/components/duel/room/DuelHistory';
import { DuelTurn } from '@/components/duel/room/DuelTurn';
import { RoomFacts } from '@/components/duel/room/RoomFacts';
import { useDuelTurnActions } from '@/hooks/useDuelTurnActions';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { useStakePurse } from '@/hooks/useStakePurse';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import type { Duel } from '@/lib/contracts';
import { canJoinWaitingDuel, seatOf } from '@/lib/duel';
import type { DuelPhase } from '@/lib/duelPhase';
import type { GameCategory } from '@/lib/game';
import { canPresentInvite } from '@/lib/invite';
import { seatMove, turnView } from '@/lib/turnView';
import { formatUSDT } from '@/lib/utils';

const contractAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];

interface RoomGridProps {
  duelId: number;
  duel: Duel;
  phase: DuelPhase;
  game: { name: string; category: GameCategory | null } | null;
  inviteSecret: `0x${string}` | null;
  /** The reader's wallet, lowercased; undefined while signed out or still loading. */
  walletAddress: `0x${string}` | undefined;
  isSignedIn: boolean;
  claimTimeout: number;
  refetch: () => Promise<unknown>;
}

/**
 * The duel page's body: the arena and, under it, the "your move" panel pointing at the reader's
 * seat; the duel's facts and history beside them on a wide screen, side by side under them on a
 * middling one, stacked on a phone.
 */
export function RoomGrid({ duelId, duel, phase, game, inviteSecret, walletAddress, isSignedIn, claimTimeout, refetch }: RoomGridProps) {
  const { language } = useTranslation();
  const { isRelayEnabled } = useRelayerStatus(DEFAULT_CHAIN_ID);
  const creatorFace = useRef<HTMLSpanElement>(null);
  const opponentFace = useRef<HTMLSpanElement>(null);
  const faces = useMemo(() => ({ creator: creatorFace, opponent: opponentFace }), []);
  const [isPreviewingJoin, setIsPreviewingJoin] = useState(false);

  const viewerSide = seatOf(duel, walletAddress);
  const canJoin = canJoinWaitingDuel({ duel, viewerAddress: walletAddress, authenticated: isSignedIn, inviteSecret, contractAddress, chainId: DEFAULT_CHAIN_ID });
  const hasKey = canPresentInvite(inviteSecret, duel.inviteHash, contractAddress, DEFAULT_CHAIN_ID);
  // The open seat answers a reader who could take it, signed in or about to be; the stake is held
  // against the wallet only once there is one that could join.
  const canTakeSeat = phase === 'created' && hasKey && (!isSignedIn || canJoin);
  const showsPurse = phase === 'created' && canJoin;
  const purse = useStakePurse(walletAddress, duel.wagerAmount, showsPurse);
  const view = turnView(
    duel,
    phase,
    {
      side: isSignedIn ? viewerSide : null,
      isSignedIn,
      hasKey,
      canJoin,
      shortRaw: purse.shortRaw,
      isRelayed: isRelayEnabled,
    },
    !!game
  );
  const seatPurse =
    showsPurse && purse.shown.kind === 'ready'
      ? { text: `${formatUSDT(purse.shown.raw, language)} USDT`, isShort: purse.shortRaw > 0n }
      : null;
  const actions = useDuelTurnActions({ duelId, duel, phase, inviteSecret, walletAddress, refetch, openTopUp: purse.openTopUp });
  // A press on the open seat makes the panel's move, the one under it; nothing while a move is under way.
  const move = seatMove(view);
  const takeSeat = move && !actions.isBusy ? () => actions.run(move) : null;

  return (
    <div className="grid grid-cols-1 gap-5 hero:grid-cols-[minmax(0,1fr)_340px] hero:items-start hero:gap-7">
      <div className="grid min-w-0 content-start gap-4">
        <DuelArena
          duelId={duelId}
          duel={duel}
          phase={phase}
          viewerSide={viewerSide}
          chainId={DEFAULT_CHAIN_ID}
          claimTimeout={claimTimeout}
          game={game}
          faceRefs={faces}
          openSeat={canTakeSeat ? { isTaking: isPreviewingJoin, purse: seatPurse, onTake: takeSeat } : undefined}
          isOwnOpenSeat={phase === 'created' && isSignedIn && viewerSide === 'creator'}
        />
        <DuelTurn
          duelId={duelId}
          duel={duel}
          view={view}
          gameName={game?.name ?? null}
          inviteSecret={inviteSecret}
          walletAddress={walletAddress}
          claimTimeout={claimTimeout}
          purse={purse}
          actions={actions}
          faces={faces}
          onPreviewJoin={setIsPreviewingJoin}
        />
      </div>
      <aside className="grid min-w-0 content-start gap-5 min-[720px]:max-[1079px]:grid-cols-2 min-[720px]:max-[1079px]:items-start hero:sticky hero:top-[92px]">
        <RoomFacts duel={duel} />
        <DuelHistory duel={duel} phase={phase} claimTimeout={claimTimeout} walletAddress={isSignedIn ? walletAddress : undefined} />
      </aside>
    </div>
  );
}
