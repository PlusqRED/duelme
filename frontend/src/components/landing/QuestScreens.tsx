'use client';

import { useEffect, useState } from 'react';
import { GameTile } from '@/components/identity/GameTile';
import { MAIN_MOCK, MockButton, Part, ScreenNote, ScreenTitle, WalletCard } from '@/components/landing/QuestScreenParts';
import { Sparks } from '@/components/landing/Sparks';
import { Icon } from '@/components/ui/icon';
import { useCountUp } from '@/hooks/useCountUp';
import { useOpenDuels } from '@/hooks/useOpenDuels';
import { QUEST_STEPS } from '@/hooks/useQuest';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/useTranslation';
import { USDT_DECIMALS } from '@/lib/constants';
import { cn, formatUSDT } from '@/lib/utils';

/** What the phone tops the made-up wallet up with. */
const SAMPLE_TOP_UP = 50n * 10n ** BigInt(USDT_DECIMALS);
/** When the top-up lands on the third screen, after the screen itself is in. */
const TOP_UP_MS = 700;

interface QuestScreenProps {
  /** The step shown, or one past the last once the quest is done. */
  reached: number;
  /** The phone has been seen: a screen acts its step out as it comes in. */
  isPlaying: boolean;
  /** The side a screen comes in from; none for the first screen, which is already there. */
  direction: 1 | -1 | 0;
  isRelayEnabled: boolean;
}

/**
 * The phone's screen for one step of the quest, coming in from the side the quest moved to, its
 * parts one after another; each step then acts itself out: a tap, a wallet made, money arriving.
 */
export function QuestScreen({ reached, isPlaying, direction, isRelayEnabled }: QuestScreenProps) {
  const isDone = reached > QUEST_STEPS;

  return (
    <div
      style={{ '--dir': direction }}
      className={cn(
        'absolute inset-[8px_16px_18px] flex flex-col gap-2.5',
        isPlaying && direction !== 0 && 'animate-screen-in',
        isDone && 'items-center justify-center text-center'
      )}
    >
      {reached === 1 && <SignInScreen isPlaying={isPlaying} />}
      {reached === 2 && <WalletScreen isPlaying={isPlaying} />}
      {reached === 3 && <FundScreen isPlaying={isPlaying} isRelayEnabled={isRelayEnabled} />}
      {reached === 4 && <ReadyScreen isPlaying={isPlaying} />}
      {isDone && <DoneScreen isPlaying={isPlaying} />}
    </div>
  );
}

function SignInScreen({ isPlaying }: { isPlaying: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <Part index={0} isPlaying={isPlaying}>
        <ScreenTitle>{t('start.mock.signin')}</ScreenTitle>
      </Part>
      <Part index={1} isPlaying={isPlaying}>
        <MockButton glyph={<Icon name="mail" className="size-[18px]" />} className={MAIN_MOCK}>
          {t('start.mock.email')}
          {isPlaying && (
            <span className="absolute top-1/2 left-[24%] size-3 -translate-1/2 animate-ripple rounded-full bg-paper/45 [animation-delay:1.1s]" />
          )}
        </MockButton>
      </Part>
      <Part index={2} isPlaying={isPlaying}>
        <MockButton
          glyph={
            <b className="grid size-5 place-items-center rounded-full border-2 border-blue text-[0.6875rem] font-extrabold text-blue">
              G
            </b>
          }
        >
          {t('start.mock.google')}
        </MockButton>
      </Part>
      <Part index={3} isPlaying={isPlaying}>
        <MockButton glyph={<Icon name="wallet" className="size-[18px]" />} className="border-dashed border-line-strong bg-transparent">
          {t('start.mock.wallet')}
        </MockButton>
      </Part>
      <Part index={4} isPlaying={isPlaying}>
        <ScreenNote>{t('start.mock.noExtension')}</ScreenNote>
      </Part>
    </>
  );
}

function WalletScreen({ isPlaying }: { isPlaying: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <Part index={0} isPlaying={isPlaying}>
        <ScreenTitle>{t('start.mock.yourWallet')}</ScreenTitle>
      </Part>
      <Part index={1} isPlaying={isPlaying}>
        <div className={cn(isPlaying && 'animate-pop [animation-delay:0.28s]')}>
          <WalletCard balance={0n} isNew={isPlaying} />
        </div>
        {isPlaying && <Sparks delayMs={580} />}
      </Part>
      <Part index={2} isPlaying={isPlaying}>
        <p className="flex items-start gap-2 rounded-[14px] bg-paper px-3 py-2.5 text-sm text-ink-2">
          <Icon name="key" className="mt-px size-[18px] flex-none text-good-ink" />
          {t('onboarding.fact1')}
        </p>
      </Part>
    </>
  );
}

function FundScreen({ isPlaying, isRelayEnabled }: { isPlaying: boolean; isRelayEnabled: boolean }) {
  const { t, language } = useTranslation();
  const reducedMotion = useReducedMotion();
  const isActedOut = isPlaying && !reducedMotion;
  const [hasLanded, setHasLanded] = useState(false);
  const balance = useCountUp(!isActedOut || hasLanded ? SAMPLE_TOP_UP : 0n) ?? 0n;

  useEffect(() => {
    if (!isActedOut) return;
    const timer = setTimeout(() => setHasLanded(true), TOP_UP_MS);
    return () => clearTimeout(timer);
  }, [isActedOut]);

  return (
    <>
      <Part index={0} isPlaying={isPlaying}>
        <ScreenTitle>{t('start.mock.addFunds')}</ScreenTitle>
      </Part>
      <Part index={1} isPlaying={isPlaying}>
        <WalletCard balance={balance} isNew={false} />
        {hasLanded && (
          <span className="absolute right-3 bottom-4 animate-float-up rounded-full bg-sun px-[9px] py-[3px] text-note font-extrabold whitespace-nowrap text-ink">
            +{formatUSDT(SAMPLE_TOP_UP, language)}&nbsp;USDT
          </span>
        )}
      </Part>
      <Part index={2} isPlaying={isPlaying}>
        <p
          className={cn(
            'flex items-center gap-2 rounded-[14px] px-3 py-2.5 text-body-sm font-strong',
            isRelayEnabled ? 'bg-good-soft text-good-ink' : 'bg-orange-soft text-orange-ink',
            isPlaying && 'animate-pop [animation-delay:1.5s]'
          )}
        >
          <Icon name="fuel" className="size-5 flex-none" />
          {t(isRelayEnabled ? 'onboarding.gasTitle' : 'onboarding.gasSelfTitle')}
        </p>
      </Part>
      <Part index={3} isPlaying={isPlaying}>
        <ScreenNote>{t(isRelayEnabled ? 'start.mock.gas' : 'start.mock.gasSelf')}</ScreenNote>
      </Part>
    </>
  );
}

function ReadyScreen({ isPlaying }: { isPlaying: boolean }) {
  const { t, language } = useTranslation();
  const { duels } = useOpenDuels();
  const open = duels.at(0);
  return (
    <>
      <Part index={0} isPlaying={isPlaying}>
        <ScreenTitle>{t('start.mock.ready')}</ScreenTitle>
      </Part>
      <Part index={1} isPlaying={isPlaying}>
        <MockButton glyph={<Icon name="plus" className="size-[18px]" />} className={cn(MAIN_MOCK, 'min-h-14 justify-center text-body')}>
          {t('hero.cta')}
        </MockButton>
      </Part>
      <Part index={2} isPlaying={isPlaying}>
        {open ? (
          <div className="grid gap-2.5">
            <ScreenNote>{t('start.mock.or')}</ScreenNote>
            <span className="flex items-center gap-2.5 rounded-2xl border border-line bg-paper p-2.5">
              <GameTile name={open.gameName} category={open.gameCategory} className="size-[38px] rounded-[11px] text-xs" />
              <span className="grid min-w-0 flex-1 text-sm">
                <b className="truncate">
                  {open.gameName ?? t('publicDuels.noGame')} #{open.id}
                </b>
                <span className="text-ink-3">{formatUSDT(open.wagerAmount, language)}&nbsp;USDT</span>
              </span>
              <span className="rounded-full bg-ink px-3 py-[7px] text-note font-bold text-paper">{t('start.mock.join')}</span>
            </span>
          </div>
        ) : (
          <ScreenNote>{t('start.mock.noneOpen')}</ScreenNote>
        )}
      </Part>
    </>
  );
}

function DoneScreen({ isPlaying }: { isPlaying: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <Part index={0} isPlaying={isPlaying}>
        <span
          className={cn(
            'grid size-24 place-items-center rounded-full bg-sun text-ink inset-shadow-avatar ring-8 ring-sun/25',
            isPlaying && 'animate-medal [animation-delay:0.2s]'
          )}
        >
          <Icon name="trophy" className="size-11" />
        </span>
        {isPlaying && <Sparks delayMs={500} />}
      </Part>
      <Part index={1} isPlaying={isPlaying}>
        <ScreenTitle>{t('start.done.title')}</ScreenTitle>
        <ScreenNote>{t('start.done.text')}</ScreenNote>
      </Part>
    </>
  );
}
