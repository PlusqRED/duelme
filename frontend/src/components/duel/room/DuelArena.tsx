'use client';

import { useId, type ComponentProps } from 'react';
import { ArenaStage } from '@/components/duel/room/ArenaStage';
import { DuelHead } from '@/components/duel/room/DuelHead';
import { DuelSteps } from '@/components/duel/room/DuelSteps';
import { useClockValue } from '@/hooks/useNow';
import { useTranslation } from '@/i18n/useTranslation';
import { arenaView } from '@/lib/arenaView';
import type { Duel } from '@/lib/contracts';
import { ZERO_ADDRESS, type SeatSide } from '@/lib/duel';
import { duelSteps, phaseLabel, secondsToAnswer, type DuelPhase } from '@/lib/duelPhase';
import type { GameCategory } from '@/lib/game';
import { isPublicDuel } from '@/lib/invite';
import { countdownClock } from '@/lib/timeWords';

interface DuelArenaProps extends Pick<ComponentProps<typeof ArenaStage>, 'faceRefs' | 'openSeat' | 'isOwnOpenSeat'> {
  duelId: number;
  duel: Duel;
  phase: DuelPhase;
  viewerSide: SeatSide | null;
  chainId: number;
  claimTimeout: number;
  game: { name: string; category: GameCategory | null } | null;
}

/**
 * The duel page's head: the landing demo's arena holding this duel — its game and state, the two
 * seats and the contract's safe, and the five steps under them. While a reported win waits for an
 * answer, its clock ticks here every second, and only here.
 */
export function DuelArena({ duelId, duel, phase, viewerSide, chainId, claimTimeout, game, faceRefs, openSeat, isOwnOpenSeat }: DuelArenaProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const secondsLeft = useClockValue((now) => (phase === 'claimed' ? secondsToAnswer(duel, now, claimTimeout) : 0));
  const clock = phase === 'claimed' ? { left: claimTimeout > 0 ? secondsLeft / claimTimeout : 0, text: countdownClock(secondsLeft) } : null;
  const opponent = duel.opponent.toLowerCase() === ZERO_ADDRESS ? null : duel.opponent;

  return (
    <section
      aria-labelledby={titleId}
      className="@container/arena relative rounded-[28px] border border-line bg-paper px-[clamp(14px,3vw,32px)] pt-5 pb-4 shadow-stage max-xs:rounded-3xl"
    >
      <DuelHead
        duelId={duelId}
        titleId={titleId}
        game={game}
        isPublic={isPublicDuel(duel.inviteHash)}
        createdAt={duel.createdAt}
        label={phaseLabel(duel, phase)}
      />
      <ArenaStage
        view={arenaView(duel, phase)}
        players={{ creator: duel.creator, opponent }}
        viewerSide={viewerSide}
        chainId={chainId}
        matchLabel={game ? t('room.match', { game: game.name }) : t('room.matchUnnamed')}
        clock={clock}
        faceRefs={faceRefs}
        openSeat={openSeat}
        isOwnOpenSeat={isOwnOpenSeat}
      />
      <DuelSteps steps={duelSteps(duel, phase)} timeUsed={clock ? 1 - clock.left : 0} />
    </section>
  );
}
