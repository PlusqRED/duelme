'use client';

import type { Ref } from 'react';
import { Bubble } from '@/components/arena/Bubble';
import { OpenSeat } from '@/components/arena/OpenSeat';
import { RepChip } from '@/components/arena/RepChip';
import { Safe } from '@/components/arena/Safe';
import { Seat } from '@/components/arena/Seat';
import { Avatar } from '@/components/identity/Avatar';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { useBalanceChange } from '@/hooks/useBalanceChange';
import { useCountUp } from '@/hooks/useCountUp';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { DEMO_STAKE_RAW, vaultTotal, type DemoSay, type DemoStage as DemoStill } from '@/lib/demoDuel';
import type { SafeTone, SeatSide } from '@/lib/duel';
import { cn, formatUSDT } from '@/lib/utils';

/** The seeds of the two made-up players' faces. */
const FACES: Record<SeatSide, string> = { creator: 'player-you', opponent: 'opponent-1' };

const SAYS: Record<DemoSay, { icon: IconName; key: TranslationKey }> = {
  won: { icon: 'trophy', key: 'sim.say.won' },
  confirm: { icon: 'check', key: 'sim.say.confirm' },
  dispute: { icon: 'x', key: 'sim.say.dispute' },
};

const VAULT_LABELS: Record<SafeTone, TranslationKey> = {
  open: 'sim.vault.open',
  locked: 'sim.vault.locked',
  paid: 'sim.vault.paid',
  refunded: 'sim.vault.refunded',
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
  const total = useCountUp(vaultTotal(stage), jump) ?? 0n;

  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(12px,0.6fr)_var(--vault-w)_minmax(12px,0.6fr)_minmax(0,1fr)] items-start pt-[66px] [--av:76px] [--box:112px] [--vault-w:128px] max-xs:grid-cols-[minmax(0,1fr)_8px_var(--vault-w)_8px_minmax(0,1fr)] max-xs:pt-[62px] max-xs:[--av:56px] max-xs:[--box:100px] max-xs:[--vault-w:96px]">
      <DemoSeat side="creator" stage={stage} jump={jump} timeout={timeout} walletRef={walletRefs.creator} />
      <Track side="creator" isLit={stage.staked.creator} />
      <Safe
        filled={stage.staked}
        slotRefs={slotRefs}
        stakeLabel={formatUSDT(DEMO_STAKE_RAW, language)}
        total={formatUSDT(total, language)}
        isLocked={stage.isLocked}
        name={t('sim.contract')}
        state={{ label: t(VAULT_LABELS[stage.vault]), tone: stage.vault }}
        above={stage.isPlaying && <Match />}
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
  const { t, language } = useTranslation();
  const raw = stage.wallets[side];
  const shown = useCountUp(raw, jump) ?? raw;
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
            <Bubble side={side} kind="say" icon={SAYS[say].icon}>
              {t(SAYS[say].key)}
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
              <span className="animate-float-up rounded-full bg-sun px-[9px] py-[3px] text-note font-extrabold whitespace-nowrap text-ink">
                +{formatUSDT(gain.delta, language)}&nbsp;USDT
              </span>
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
        <b className="relative text-body-sm font-strong text-ink tabular-nums">{formatUSDT(shown, language)}</b>
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

/** The way between a seat and the safe, lit in the seat's colour once its stake is inside. */
function Track({ side, isLit }: { side: SeatSide; isLit: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-side={side}
      className={cn(
        'relative mt-[calc(var(--box)/2-1px)] h-0 border-t-2 border-dashed border-line-strong',
        'after:absolute after:inset-x-0 after:-top-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-red after:transition-transform after:duration-500 data-[side=opponent]:after:origin-right data-[side=opponent]:after:bg-blue',
        isLit && 'after:scale-x-100'
      )}
    />
  );
}

/** The match being played over the safe, its progress a bar sweeping back and forth. */
function Match() {
  const { t } = useTranslation();

  return (
    <p className="absolute bottom-[calc(100%+30px)] left-1/2 inline-flex h-8 -translate-x-1/2 animate-pop items-center gap-1.5 overflow-hidden rounded-full border border-line bg-canvas px-3 text-note font-label whitespace-nowrap">
      <Icon name="gamepad" className="size-[17px]" />
      {t('sim.match')}
      <i aria-hidden="true" className="absolute bottom-0 left-0 h-[3px] w-[36%] animate-scan rounded-[3px] bg-ink" />
    </p>
  );
}
