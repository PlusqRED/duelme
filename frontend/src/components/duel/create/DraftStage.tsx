'use client';

import { useMemo, useRef, type ReactNode, type Ref } from 'react';
import { Bubble } from '@/components/arena/Bubble';
import { CountedUsdt } from '@/components/arena/CountedUsdt';
import { OpenSeat } from '@/components/arena/OpenSeat';
import { Safe } from '@/components/arena/Safe';
import { Seat } from '@/components/arena/Seat';
import { Track } from '@/components/arena/Track';
import { arenaStageClassName } from '@/components/duel/room/ArenaStage';
import { Avatar } from '@/components/identity/Avatar';
import { ReputationPill } from '@/components/identity/ReputationPill';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { useTranslation } from '@/i18n/useTranslation';
import { truncateAddress } from '@/lib/utils';

interface DraftStageProps {
  /** The creator, once signed in; their seat waits for them in red until then. */
  address: `0x${string}` | null;
  chainId: number;
  /** The stake, in USDT's smallest unit; null while none is set. */
  stakeRaw: bigint | null;
  stakeLabel: string;
  /** The creator's message, as their seat says it. */
  message: string;
  isPublic: boolean;
  /** What is in the creator's wallet, under their seat; null signed out or before it is read. */
  balanceLabel: string | null;
  /** The duel is on the chain: the creator's stake is in the safe and the opponent's outline fades. */
  isCreated: boolean;
  /** Raised as a stake is set on the slider: the planned stakes bump. */
  bumpKey: number;
  /** The creator's face, which the setup panel points at. */
  creatorFace: Ref<HTMLSpanElement>;
}

/** A short fact under a seat: who may sit there, what is in your wallet. */
function SeatTag({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex min-h-6 max-w-full items-center gap-1 rounded-full bg-canvas py-0.5 pr-[9px] pl-[7px] text-xs/[1.2] font-bold text-ink-2 tabular-nums max-xs:rounded-[10px] max-xs:px-2 max-xs:py-[3px] max-xs:text-center max-xs:text-micro">
      <Icon name={icon} className="size-3.5 text-ink-3 max-xs:hidden" />
      <span>{children}</span>
    </span>
  );
}

/**
 * The duel's table before it exists: the creator's seat with what they will say, the opponent's
 * open seat and who may take it, and the stakes only outlined in the safe, which stays empty until
 * the creator signs. Created, the creator's stake is in and the opponent's outline fades.
 */
export function DraftStage({ address, chainId, stakeRaw, stakeLabel, message, isPublic, balanceLabel, isCreated, bumpKey, creatorFace }: DraftStageProps) {
  const { t } = useTranslation();
  const creatorSlot = useRef<HTMLSpanElement>(null);
  const opponentSlot = useRef<HTMLSpanElement>(null);
  const addresses = useMemo(() => [address ?? undefined], [address]);
  const { reputationStatsByAddress } = useReputationLevels(addresses, chainId);
  const level = address ? reputationStatsByAddress[address.toLowerCase()] : undefined;

  return (
    <div className={arenaStageClassName}>
      <Seat
        face={
          <span ref={creatorFace} className="block size-full">
            {address ? (
              <Avatar address={address} tone="red" className="size-full ring-[2.5px] ring-ink ring-offset-3 ring-offset-paper" />
            ) : (
              <OpenSeat isYours className="size-full" />
            )}
          </span>
        }
        above={
          message && (
            <Bubble side="creator" kind="note">
              “{message}”
            </Bubble>
          )
        }
        timer={null}
        isWinner={false}
        name={address ? t('room.you') : t('create.seat.signIn')}
        isOpen={!address}
        isYou={!!address}
        isYoursEmpty={!address}
      >
        {address && <p className="-mt-1 text-note text-ink-3 tabular-nums max-xs:text-xs">{truncateAddress(address)}</p>}
        <p className="flex min-h-7 max-w-full flex-col items-center gap-1">
          {level && (
            <span title={t('room.rep.stats', { honored: level.honored, abandoned: level.abandoned })}>
              <ReputationPill level={level.level} className="text-xs max-xs:h-[22px] max-xs:pr-[7px] max-xs:pl-1.5 max-xs:text-micro" />
            </span>
          )}
          {balanceLabel && <SeatTag icon="wallet">{balanceLabel}&nbsp;USDT</SeatTag>}
        </p>
      </Seat>
      <Track side="creator" isLit={isCreated} />
      <Safe
        filled={{ creator: isCreated, opponent: false }}
        ghosts={{ creator: 'planned', opponent: isCreated ? 'gone' : 'planned' }}
        bumpKey={bumpKey}
        slotRefs={{ creator: creatorSlot, opponent: opponentSlot }}
        stakeLabel={stakeLabel}
        total={<CountedUsdt raw={isCreated && stakeRaw !== null ? stakeRaw : 0n} />}
        isLocked={false}
        name={t('sim.contract')}
        state={isCreated ? { label: t('room.vault.waiting'), tone: 'waiting' } : { label: t('room.vault.draft'), tone: 'open' }}
      />
      <Track side="opponent" isLit={false} />
      <Seat face={<OpenSeat className="size-full" />} timer={null} isWinner={false} name={t('sim.openSeat')} isOpen>
        <p className="flex min-h-7 max-w-full flex-col items-center gap-1">
          {!isCreated && <SeatTag icon={isPublic ? 'globe' : 'lock'}>{t(isPublic ? 'create.seat.anyone' : 'create.seat.link')}</SeatTag>}
        </p>
      </Seat>
    </div>
  );
}
