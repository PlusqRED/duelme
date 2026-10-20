'use client';

import { useMemo, useRef, type RefObject } from 'react';
import { CountedUsdt } from '@/components/arena/CountedUsdt';
import { Match } from '@/components/arena/Match';
import { Safe } from '@/components/arena/Safe';
import { Track } from '@/components/arena/Track';
import { RoomSeat, type AnswerClock, type TakeableSeat } from '@/components/duel/room/RoomSeat';
import { useArenaMotion } from '@/hooks/useArenaMotion';
import { useNicknames } from '@/hooks/useNicknames';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { useStakeFlights } from '@/hooks/useStakeFlights';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import type { ArenaView } from '@/lib/arenaView';
import type { SafeTone, SeatSide } from '@/lib/duel';
import { formatUSDT } from '@/lib/utils';

/** A small copy of the table reads nobody's level. */
const NO_PLAYERS: (string | undefined)[] = [];

const vaultLabels: Record<SafeTone, TranslationKey> = {
  open: 'sim.vault.open',
  waiting: 'room.vault.waiting',
  locked: 'room.vault.locked',
  paused: 'room.vault.paused',
  unlocked: 'room.vault.unlocked',
  forWinner: 'room.vault.forWinner',
  paid: 'room.vault.paid',
  returning: 'room.vault.returning',
  returned: 'room.vault.returned',
};

/** The table's grid: seat, track, safe, track, seat; the avatar's size `--av` and the safe's `--box`. */
export const arenaStageClassName =
  'relative mx-auto grid max-w-[660px] grid-cols-[minmax(0,1fr)_minmax(12px,0.6fr)_var(--vault-w)_minmax(12px,0.6fr)_minmax(0,1fr)] items-start pt-[78px] [--av:84px] [--box:116px] [--vault-w:140px] max-xs:grid-cols-[minmax(0,1fr)_8px_var(--vault-w)_8px_minmax(0,1fr)] max-xs:pt-[70px] max-xs:[--av:58px] max-xs:[--box:100px] max-xs:[--vault-w:96px]';

/** The same table as a small copy, one of several on a page. */
const compactStageClassName =
  'relative mx-auto grid w-full max-w-[400px] grid-cols-[minmax(0,1fr)_8px_var(--vault-w)_8px_minmax(0,1fr)] items-start pt-[60px] [--av:52px] [--box:86px] [--vault-w:94px]';

interface ArenaStageProps {
  /** The arena to show; changes to it play out in the landing demo's order. */
  view: ArenaView;
  players: Record<SeatSide, `0x${string}` | null>;
  /** The reader's seat, if they play in this duel. */
  viewerSide: SeatSide | null;
  chainId: number;
  /** The game being played, over the safe while the money is locked. */
  matchLabel: string;
  clock: AnswerClock | null;
  /** The seats' faces, when the page points at them too (the turn panel's notch). */
  faceRefs?: Record<SeatSide, RefObject<HTMLSpanElement | null>>;
  /** The open seat, for a reader who could take it: shown sitting down while they point at Join, and their wallet under it. */
  openSeat?: TakeableSeat;
  /**
   * A small copy of the table, one of several on a page: smaller seats and safe, and only who sits
   * where, what they say and the money; no levels, no match, no names under the safe.
   */
  isCompact?: boolean;
}

/**
 * A real duel's table: the creator on the left, the opponent's seat on the right, the contract's
 * safe between, and the stakes flying between them as the duel moves.
 */
export function ArenaStage({ view, players, viewerSide, chainId, matchLabel, clock, faceRefs, openSeat, isCompact = false }: ArenaStageProps) {
  const { t, language } = useTranslation();
  const flightsRef = useRef<HTMLDivElement>(null);
  const ownCreatorFace = useRef<HTMLSpanElement>(null);
  const ownOpponentFace = useRef<HTMLSpanElement>(null);
  const creatorFace = faceRefs?.creator ?? ownCreatorFace;
  const opponentFace = faceRefs?.opponent ?? ownOpponentFace;
  const creatorSlot = useRef<HTMLSpanElement>(null);
  const opponentSlot = useRef<HTMLSpanElement>(null);
  const anchors = useMemo(
    () => ({
      stage: flightsRef,
      homes: { creator: creatorFace, opponent: opponentFace },
      slots: { creator: creatorSlot, opponent: opponentSlot },
    }),
    [creatorFace, opponentFace]
  );
  const flights = useStakeFlights(anchors);
  const { shown, gains } = useArenaMotion(view, flights.fly, flights.cancel);

  const addresses = useMemo(() => [players.creator ?? undefined, players.opponent ?? undefined], [players.creator, players.opponent]);
  const { resolveDisplay } = useNicknames(addresses);
  const { reputationStatsByAddress } = useReputationLevels(isCompact ? NO_PLAYERS : addresses, chainId);

  const seat = (side: SeatSide) => {
    const address = players[side];
    const isYou = viewerSide === side;
    return (
      <RoomSeat
        side={side}
        seat={shown.seats[side]}
        address={address}
        name={!address ? t('sim.openSeat') : isYou ? t('room.you') : resolveDisplay(address)}
        isYou={isYou}
        level={address && shown.showsLevels ? reputationStatsByAddress[address.toLowerCase()] : undefined}
        note={side === 'creator' ? shown.note : null}
        clock={clock}
        gain={gains[side]}
        faceRef={side === 'creator' ? creatorFace : opponentFace}
        takeable={address ? undefined : openSeat}
        isCompact={isCompact}
      />
    );
  };

  return (
    <div className={isCompact ? compactStageClassName : arenaStageClassName}>
      {seat('creator')}
      <Track side="creator" isLit={shown.staked.creator} />
      <Safe
        filled={shown.staked}
        slotRefs={{ creator: creatorSlot, opponent: opponentSlot }}
        stakeLabel={formatUSDT(shown.stakeRaw, language)}
        total={<CountedUsdt raw={shown.totalRaw} />}
        isLocked={shown.isLocked}
        isPayout={shown.isPayout}
        name={isCompact ? undefined : t('sim.contract')}
        state={{ label: t(vaultLabels[shown.vault]), tone: shown.vault }}
        above={
          !isCompact &&
          shown.match && <Match label={shown.match === 'paused' ? t('room.paused') : matchLabel} isPaused={shown.match === 'paused'} />
        }
        isCompact={isCompact}
      />
      <Track side="opponent" isLit={shown.staked.opponent} />
      {seat('opponent')}
      <div ref={flightsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-3" />
    </div>
  );
}
