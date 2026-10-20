'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArenaStage } from '@/components/duel/room/ArenaStage';
import { useClockValue } from '@/hooks/useNow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { arenaView, arrivalView } from '@/lib/arenaView';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import type { MyDuel } from '@/lib/dashboard';
import { ZERO_ADDRESS } from '@/lib/duel';
import { secondsToAnswer } from '@/lib/duelPhase';
import { countdownClock } from '@/lib/timeWords';

interface MiniArenaProps {
  entry: MyDuel;
  claimTimeout: number;
  /** Its card has been on screen: the stakes drop into the safe, `delayMs` after it was seen. */
  isSeen: boolean;
  delayMs: number;
}

/**
 * A duel that is on as a small copy of its arena: the seats, what the players say, the clock round
 * the player who has to answer and the safe. The safe stays empty until its card is seen, and then
 * takes its stakes as the duel page does on arrival; a later change of the duel plays out as there.
 */
export function MiniArena({ entry, claimTimeout, isSeen, delayMs }: MiniArenaProps) {
  const { duel, phase, seat } = entry;
  const reducedMotion = useReducedMotion();
  const [isArrived, setIsArrived] = useState(false);
  const view = useMemo(() => arenaView(duel, phase), [duel, phase]);
  const secondsLeft = useClockValue((now) => (phase === 'claimed' ? secondsToAnswer(duel, now, claimTimeout) : 0));
  const clock = phase === 'claimed' ? { left: claimTimeout > 0 ? secondsLeft / claimTimeout : 0, text: countdownClock(secondsLeft) } : null;
  const opponent = duel.opponent.toLowerCase() === ZERO_ADDRESS ? null : duel.opponent;

  useEffect(() => {
    if (!isSeen || isArrived) return;
    const timer = setTimeout(() => setIsArrived(true), delayMs);
    return () => clearTimeout(timer);
  }, [isSeen, isArrived, delayMs]);

  return (
    <ArenaStage
      view={reducedMotion || isArrived ? view : arrivalView(view)}
      players={{ creator: duel.creator, opponent }}
      viewerSide={seat}
      chainId={DEFAULT_CHAIN_ID}
      matchLabel=""
      clock={clock}
      isCompact
    />
  );
}
