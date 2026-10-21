'use client';

import type { Ref } from 'react';
import { Bubble } from '@/components/arena/Bubble';
import { CountedUsdt } from '@/components/arena/CountedUsdt';
import { Match } from '@/components/arena/Match';
import { OpenSeat } from '@/components/arena/OpenSeat';
import { RepChip } from '@/components/arena/RepChip';
import { Safe } from '@/components/arena/Safe';
import { Seat } from '@/components/arena/Seat';
import { seatSays } from '@/components/arena/seatSays';
import { Track } from '@/components/arena/Track';
import { Avatar } from '@/components/identity/Avatar';
import { GainTag } from '@/components/arena/GainTag';
import { Icon } from '@/components/ui/icon';
import { useBalanceChange } from '@/hooks/useBalanceChange';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { DEMO_STAKE_RAW, vaultTotal, type DemoStill, type DemoVault } from '@/lib/demoDuel';
import type { SeatSide } from '@/lib/duel';
import { cn, formatUSDT } from '@/lib/utils';

/** The seeds of the two made-up players' faces. */
const FACES: Record<SeatSide, string> = { creator: 'player-you', opponent: 'opponent-1' };

const vaultLabels: Record<DemoVault, TranslationKey> = {
  open: 'sim.vault.open',
  locked: 'sim.vault.locked',
  paid: 'sim.vault.paid',
  returned: 'sim.vault.refunded',
};

interface DemoStageProps {
  stage: DemoStill;
  /** Changes with every still shown at once: the figures show it without counting. */
  jump: number;
  /** The opponent's time to answer a reported win, in words. */
  timeout: string;
  /** Where stakes fly, over the stage. */
  flightsRef: Ref<HTMLDivElement>;
  walletRefs: Record<SeatSide, Ref<HTMLParagraphElement>>;
  slotRefs: Record<SeatSide, Ref<HTMLSpanElement>>;
}

/** The demo's table: you on the left, the opponent's seat on the right, the contract's safe between. */
export function DemoStage({ stage, jump, timeout, flightsRef, walletRefs, slotRefs }: DemoStageProps) {
  const { t, language } = useTranslation();

  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(12px,0.6fr)_var(--vault-w)_minmax(12px,0.6fr)_minmax(0,1fr)] items-start pt-[66px] [--av:76px] [--box:112px] [--vault-w:128px] max-xs:grid-cols-[minmax(0,1fr)_8px_var(--vault-w)_8px_minmax(0,1fr)] max-xs:pt-[62px] max-xs:[--av:56px] max-xs:[--box:100px] max-xs:[--vault-w:96px]">
      <DemoSeat side="creator" stage={stage} jump={jump} timeout={timeout} walletRef={walletRefs.creator} />
      <Track side="creator" isLit={stage.staked.creator} />
      <Safe
        filled={stage.staked}
        slotRefs={slotRefs}
        stakeLabel={formatUSDT(DEMO_STAKE_RAW, language)}
        total={<CountedUsdt raw={vaultTotal(stage)} epoch={jump} />}
        isLocked={stage.isLocked}
        name={t('sim.contract')}
        state={{ label: t(vaultLabels[stage.vault]), tone: stage.vault }}
        above={stage.isPlaying && <Match label={t('sim.match')} />}
      />
      <Track side="opponent" isLit={stage.staked.opponent} />
      <DemoSeat side="opponent" stage={stage} jump={jump} timeout={timeout} walletRef={walletRefs.opponent} />
      <div ref={flightsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-3" />
    </div>
  );
}

interface DemoSeatProps {
  side: SeatSide;
  stage: DemoStill;
  jump: number;
  timeout: string;
  walletRef: Ref<HTMLParagraphElement>;
}

function DemoSeat({ side, stage, jump, timeout, walletRef }: DemoSeatProps) {
  const { t } = useTranslation();
  const raw = stage.wallets[side];
  const change = useBalanceChange(raw, jump);
  const gain = change && change.delta > 0n ? change : null;
  const say = stage.says[side];
  const isOpponent = side === 'opponent';
  const isOpen = isOpponent && !stage.isJoined;
  const timer = isOpponent ? stage.timer : null;

  return (
    <Seat
      face={
        isOpen ? (
          <OpenSeat className="size-full" />
        ) : (
          <Avatar
            address={FACES[side]}
            tone={isOpponent ? 'blue' : 'red'}
            className={cn('size-full', isOpponent && 'animate-pop')}
          />
        )
      }
      above={
        <>
          {say && (
            <Bubble side={side} kind="say" icon={seatSays[say].icon}>
              {t(seatSays[say].key)}
            </Bubble>
          )}
          {timer && (
            <Bubble side={side} kind="timer" icon="clock">
              {timer === 'up' ? t('sim.timeUp') : t('sim.timer', { timeout })}
            </Bubble>
          )}
          {gain && (
            // The money that just came in rises off the face.
            <span key={gain.id} aria-hidden="true" className="pointer-events-none absolute inset-0 z-2 grid place-items-center">
              <GainTag amount={gain.delta} />
            </span>
          )}
        </>
      }
      timer={timer}
      isWinner={side === 'creator' && stage.hasWinner}
      name={isOpponent ? t(stage.isJoined ? 'sim.opponent' : 'sim.openSeat') : t('sim.you')}
      isOpen={isOpen}
    >
      <p
        ref={walletRef}
        className="relative inline-flex items-center gap-1 rounded-full bg-canvas py-1 pr-2.5 pl-2 text-xs whitespace-nowrap text-ink-2 max-xs:py-[3px] max-xs:pr-2 max-xs:pl-1.5"
      >
        {gain && <span key={gain.id} aria-hidden="true" className="absolute inset-0 animate-gain-ring rounded-[inherit] bg-sun opacity-0" />}
        <Icon name="wallet" className="relative size-3.5 text-ink-3 max-xs:hidden" />
        <span className="sr-only">{t('sim.wallet')}</span>
        <b className="relative text-body-sm font-strong text-ink tabular-nums">
          <CountedUsdt raw={raw} epoch={jump} />
        </b>
        <small className="relative">USDT</small>
      </p>
      <p className="flex min-h-7 flex-col items-center gap-1">
        {stage.marks[side].map((mark) => (
          <RepChip key={mark} mark={mark} />
        ))}
      </p>
    </Seat>
  );
}
