'use client';

import { useState, type Ref } from 'react';
import { Bubble } from '@/components/arena/Bubble';
import { GainTag } from '@/components/arena/GainTag';
import { MoneyChip } from '@/components/arena/MoneyChip';
import { OpenSeat } from '@/components/arena/OpenSeat';
import { RepChip } from '@/components/arena/RepChip';
import { Seat } from '@/components/arena/Seat';
import { seatSays } from '@/components/arena/seatSays';
import { Avatar } from '@/components/identity/Avatar';
import { ReputationPill } from '@/components/identity/ReputationPill';
import { Icon } from '@/components/ui/icon';
import type { ArenaGain } from '@/hooks/useArenaMotion';
import { useTranslation } from '@/i18n/useTranslation';
import type { ArenaSeat } from '@/lib/arenaView';
import type { SeatSide } from '@/lib/duel';
import type { ReputationSummary } from '@/lib/reputation';
import { cn, truncateAddress } from '@/lib/utils';

/** A reported win's clock: the share of the time to answer still left, and the time itself. */
export interface AnswerClock {
  left: number;
  text: string;
}

/** The open seat's wallet line for a reader who could join: their USDT, orange when it can't cover the stake. */
export interface SeatPurse {
  text: string;
  isShort: boolean;
}

/** An open seat the reader could take: shown with them in it while they point at Join, and their wallet under it. */
export interface TakeableSeat {
  isTaking: boolean;
  purse: SeatPurse | null;
}

interface RoomSeatProps {
  side: SeatSide;
  seat: ArenaSeat;
  /** Who sits here; null while nobody has joined. */
  address: `0x${string}` | null;
  name: string;
  isYou: boolean;
  /** Their record, shown until the duel is settled; unknown until the contract has answered. */
  level: ReputationSummary | undefined;
  /** The creator's own words, while the duel waits for an opponent. */
  note: string | null;
  clock: AnswerClock | null;
  gain: ArenaGain | undefined;
  /** Where this seat's money flies from and lands. */
  faceRef: Ref<HTMLSpanElement>;
  /** Set on an open seat the reader could take. */
  takeable?: TakeableSeat;
}

/**
 * One player's seat in a real duel: their face, or an open seat until someone joins; what they say,
 * their note or their clock above it; their name, "You" on the reader's own seat with the address
 * under it; then their level while the duel runs, and once it is over their money and what it added
 * to their record. An open seat the reader could take carries their wallet's USDT, and shows them
 * sitting down while they point at Join.
 */
export function RoomSeat({ side, seat, address, name, isYou, level, note, clock, gain, faceRef, takeable }: RoomSeatProps) {
  const purse = takeable?.purse;
  const { t } = useTranslation();
  // A player who sits down while the page is open pops in.
  const [firstAddress] = useState(address);
  const say = seat.say ? seatSays[seat.say] : null;

  return (
    <Seat
      face={
        <span ref={faceRef} className="block size-full">
          {address ? (
            <Avatar
              address={address}
              tone={side === 'creator' ? 'red' : 'blue'}
              className={cn(
                'size-full',
                isYou && 'ring-[2.5px] ring-ink ring-offset-3 ring-offset-paper',
                address !== firstAddress && 'animate-pop'
              )}
            />
          ) : (
            <OpenSeat className="size-full" you={takeable && t('room.you')} isTaking={takeable?.isTaking} />
          )}
        </span>
      }
      above={
        <>
          {say ? (
            <Bubble side={side} kind="say" icon={say.icon}>
              {t(say.key)}
            </Bubble>
          ) : (
            note && (
              <Bubble side={side} kind="note">
                “{note}”
              </Bubble>
            )
          )}
          {seat.timer && (
            <Bubble side={side} kind="timer" icon="clock">
              {seat.timer === 'up' || !clock ? t('sim.timeUp') : t('room.timer.left', { time: clock.text })}
            </Bubble>
          )}
          {gain && (
            // The money that just came in rises off the face.
            <span key={gain.id} aria-hidden="true" className="pointer-events-none absolute inset-0 z-2 grid place-items-center">
              <GainTag amount={gain.raw} />
            </span>
          )}
        </>
      }
      timer={seat.timer}
      timerLeft={seat.timer ? (clock?.left ?? 0) : undefined}
      isWinner={seat.isWinner}
      name={name}
      isOpen={!address}
      isYou={isYou && !!address}
    >
      {isYou && address && <p className="-mt-1 text-note text-ink-3 tabular-nums max-xs:text-xs">{truncateAddress(address)}</p>}
      <p className="flex min-h-7 max-w-full flex-col items-center gap-1">
        {level && (
          <span title={t('room.rep.stats', { honored: level.honored, abandoned: level.abandoned })}>
            <ReputationPill level={level.level} className="text-xs max-xs:h-[22px] max-xs:pr-[7px] max-xs:pl-1.5 max-xs:text-micro" />
          </span>
        )}
        {seat.money && <MoneyChip kind={seat.money.kind} raw={seat.money.raw} />}
        {seat.marks.map((mark) => (
          <RepChip key={mark} mark={mark} />
        ))}
        {purse && (
          <span
            className={cn(
              'inline-flex min-h-6 max-w-full items-center gap-1 rounded-full bg-canvas py-0.5 pr-[9px] pl-[7px] text-xs/[1.2] font-strong text-ink-2 tabular-nums max-xs:rounded-[10px] max-xs:px-2 max-xs:py-[3px] max-xs:text-center max-xs:text-micro',
              purse.isShort && 'bg-orange-wash text-orange-ink shadow-[inset_0_0_0_1px_var(--color-orange-line)]'
            )}
          >
            <Icon name="wallet" className={cn('size-3.5 max-xs:hidden', purse.isShort ? 'text-orange-ink' : 'text-ink-3')} />
            {purse.text}
          </span>
        )}
      </p>
    </Seat>
  );
}
