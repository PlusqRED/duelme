'use client';

import { useId, useState, type ComponentProps } from 'react';
import { DraftHead } from '@/components/duel/create/DraftHead';
import { DraftStage } from '@/components/duel/create/DraftStage';
import { DuelHead } from '@/components/duel/room/DuelHead';
import { DuelSteps } from '@/components/duel/room/DuelSteps';
import { draftSteps, duelSteps, phaseLabel } from '@/lib/duelPhase';
import type { Game } from '@/lib/game';

/** A duel just created holds its creator's stake and nothing else yet. */
const NO_PAYOUTS = { creatorPayout: 0n, opponentPayout: 0n, creatorClaimed: false, opponentClaimed: false };

interface DraftArenaProps extends Omit<ComponentProps<typeof DraftStage>, 'isCreated'> {
  game: Game | null;
  /** The duel once it is on the chain: its number. */
  created: { id: number } | null;
}

/** The duel page's head for the duel just created, which was made the moment it shows up here. */
function CreatedHead({ id, titleId, game, isPublic }: { id: number; titleId: string; game: Game | null; isPublic: boolean }) {
  const [createdAt] = useState(() => BigInt(Math.floor(Date.now() / 1000)));
  return (
    <DuelHead duelId={id} titleId={titleId} game={game} isPublic={isPublic} createdAt={createdAt} label={phaseLabel(NO_PAYOUTS, 'created')} />
  );
}

/**
 * The create page's arena: the duel page's head before the duel exists. It fills in while the duel
 * is set up, and once it is created it is the duel page's own, waiting for an opponent.
 */
export function DraftArena({ game, created, ...stage }: DraftArenaProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="@container/arena relative rounded-[28px] border border-line bg-paper px-[clamp(14px,3vw,32px)] pt-5 pb-4 shadow-stage max-xs:rounded-3xl"
    >
      {created ? (
        <CreatedHead id={created.id} titleId={titleId} game={game} isPublic={stage.isPublic} />
      ) : (
        <DraftHead titleId={titleId} game={game} isPublic={stage.isPublic} />
      )}
      <DraftStage {...stage} isCreated={created !== null} />
      <DuelSteps steps={created ? duelSteps(NO_PAYOUTS, 'created') : draftSteps()} timeUsed={0} />
    </section>
  );
}
