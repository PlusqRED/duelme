'use client';

import { useId, useMemo, useRef } from 'react';
import { DemoEndings } from '@/components/landing/DemoEndings';
import { DemoStage } from '@/components/landing/DemoStage';
import { DemoStepper } from '@/components/landing/DemoStepper';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { useContractConfig } from '@/hooks/useContractConfig';
import { DEMO_DWELL_MS, useDemoDuel } from '@/hooks/useDemoDuel';
import { useStakeFlights } from '@/hooks/useStakeFlights';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { DEMO_LAST_STEP, DEMO_STAKE_RAW, demoStatus } from '@/lib/demoDuel';
import { durationWords } from '@/lib/timeWords';
import { formatUSDT } from '@/lib/utils';

type PlayMode = 'play' | 'pause' | 'replay';

const PLAY_MODES: Record<PlayMode, { icon: IconName; key: TranslationKey }> = {
  play: { icon: 'play', key: 'sim.play' },
  pause: { icon: 'pause', key: 'sim.pause' },
  replay: { icon: 'replay', key: 'sim.replay' },
};

/**
 * A 10 USDT duel acted out on the landing, from the first stake to the payout: two seats, the
 * contract's safe between them and the money flying in and out. It plays itself once when it comes
 * into view; the steps and the three endings show any moment of it.
 */
export function DemoDuel() {
  const { t, plural, language } = useTranslation();
  const { claimTimeout } = useContractConfig();
  const titleId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const flightsRef = useRef<HTMLDivElement>(null);
  const creatorWallet = useRef<HTMLParagraphElement>(null);
  const opponentWallet = useRef<HTMLParagraphElement>(null);
  const creatorSlot = useRef<HTMLSpanElement>(null);
  const opponentSlot = useRef<HTMLSpanElement>(null);
  const anchors = useMemo(
    () => ({
      stage: flightsRef,
      wallets: { creator: creatorWallet, opponent: opponentWallet },
      slots: { creator: creatorSlot, opponent: opponentSlot },
    }),
    []
  );
  const flights = useStakeFlights(anchors, formatUSDT(DEMO_STAKE_RAW, language));
  const demo = useDemoDuel({ root: rootRef, fly: flights.fly, cancelFlights: flights.cancel });
  const timeout = durationWords(claimTimeout, plural);
  const status = demoStatus(demo.step, demo.outcome);
  const mode: PlayMode = demo.isPlaying ? 'pause' : demo.step === DEMO_LAST_STEP ? 'replay' : 'play';

  return (
    <section
      id="demo"
      ref={rootRef}
      aria-labelledby={titleId}
      style={{ '--dwell': `${DEMO_DWELL_MS}ms` }}
      className="@container/sim relative min-w-0 rounded-[28px] border border-line bg-paper px-[clamp(14px,2.4vw,28px)] pt-[18px] pb-5 shadow-stage max-xs:rounded-3xl"
    >
      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <Chip className="h-[26px] bg-sun-soft px-2.5 font-bold text-sun-ink">{t('sim.tag')}</Chip>
        <h2 id={titleId} className="text-base font-bold tracking-[-0.01em]">
          {t('sim.title')}
        </h2>
        <Button variant="paper" size="sm" onClick={demo.toggle} className="ml-auto">
          <Icon name={PLAY_MODES[mode].icon} className="size-[18px]" />
          {t(PLAY_MODES[mode].key)}
        </Button>
      </header>

      <DemoStage
        stage={demo.stage}
        jump={demo.jump}
        timeout={timeout}
        flightsRef={flightsRef}
        walletRefs={{ creator: creatorWallet, opponent: opponentWallet }}
        slotRefs={{ creator: creatorSlot, opponent: opponentSlot }}
      />

      <div aria-live="polite" className="mt-[18px] min-h-[7.4em] border-t border-line pt-4">
        <p
          key={`state-${demo.step}-${demo.outcome}`}
          data-tone={status.tone}
          className="flex animate-swap items-center gap-2.5 text-xl/[1.2] font-extrabold tracking-[-0.015em] [--tone-soft:var(--color-canvas)] [--tone:var(--color-ink-3)] before:size-2.5 before:shrink-0 before:rounded-full before:bg-(--tone) before:shadow-[0_0_0_4px_var(--tone-soft)] data-[tone=confirm]:[--tone-soft:var(--color-sun-soft)] data-[tone=confirm]:[--tone:var(--color-sun-edge)] data-[tone=locked]:[--tone-soft:var(--color-canvas-deep)] data-[tone=locked]:[--tone:var(--color-ink)] data-[tone=paid]:[--tone-soft:var(--color-sun-soft)] data-[tone=paid]:[--tone:var(--color-sun)] data-[tone=waiting]:[--tone-soft:var(--color-blue-soft)] data-[tone=waiting]:[--tone:var(--color-blue)]"
        >
          {t(status.state)}
        </p>
        <p key={`desc-${demo.step}-${demo.outcome}`} className="mt-1.5 max-w-[62ch] animate-swap text-ink-2 [animation-delay:50ms]">
          {t(status.desc, { timeout })}
        </p>
      </div>

      <DemoStepper step={demo.step} timing={demo.timing} onPick={demo.pickStep} />
      <DemoEndings
        picked={demo.step === DEMO_LAST_STEP ? demo.outcome : null}
        isInviting={demo.isInviting}
        onPick={demo.pickOutcome}
      />
    </section>
  );
}
