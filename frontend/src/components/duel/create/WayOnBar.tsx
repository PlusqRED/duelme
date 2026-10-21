'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import type { WayOn } from '@/lib/createSetup';
import { cn } from '@/lib/utils';

interface WaySpec {
  text: TranslationKey;
  label: TranslationKey;
  icon: IconName;
  /** Something is missing: the line says what, and Create duel waits for it. */
  isBlocked?: true;
}

const specs: Record<WayOn, WaySpec> = {
  game: { text: 'create.bar.game', label: 'create.cta', icon: 'plus', isBlocked: true },
  stake: { text: 'create.bar.stake', label: 'create.cta', icon: 'plus', isBlocked: true },
  message: { text: 'create.bar.message', label: 'create.cta', icon: 'plus', isBlocked: true },
  signIn: { text: 'create.bar.signIn', label: 'nav.connectWallet', icon: 'login' },
  short: { text: 'create.bar.short', label: 'topup.action', icon: 'plus' },
  ready: { text: 'create.bar.ready', label: 'create.cta', icon: 'plus' },
};

/** The button of the bar this screen shows: the panel's on a narrow screen, the side's on a wide one. */
export function shownWayOnButton(): HTMLElement | null {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-way-on]'));
  return buttons.find((button) => button.offsetParent !== null) ?? null;
}

interface WayOnBarProps {
  way: WayOn;
  /** What the line names: the minimum, the message's limit, the shortfall, the stake. */
  params: TranslationParams;
  /** At the end of the setup panel, or under the facts on a wide screen. */
  place: 'panel' | 'side';
  /** Pinned to the bottom of a phone: only once it is the next thing to press, never over a step's own button. */
  isSticky?: boolean;
  onGo: (way: WayOn) => void;
}

/**
 * Never a dead end: what stands between the player and Create duel, and the button that deals with
 * it. Signed out it signs in, short it tops up, and once nothing is missing it creates the duel.
 */
export function WayOnBar({ way, params, place, isSticky = false, onGo }: WayOnBarProps) {
  const { t } = useTranslation();
  const spec = specs[way];

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-[18px] gap-y-2.5',
        place === 'panel' && [
          '-mx-[clamp(18px,3vw,28px)] mt-0.5 -mb-[clamp(18px,3vw,28px)] rounded-b-[22px] border-t-[1.5px] border-dashed border-line-strong bg-paper/95 px-[clamp(18px,3vw,28px)] pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] backdrop-blur-[8px] hero:hidden',
          isSticky && 'sticky bottom-0 z-5',
        ],
        place === 'side' && 'mt-1.5 hidden border-t-[1.5px] border-dashed border-line-strong pt-4 hero:flex'
      )}
    >
      <p aria-live="polite" className={cn('min-w-0 text-body-sm text-ink-2', place === 'side' ? 'flex-[1_1_100%]' : 'flex-[1_1_240px]')}>
        {t(spec.text, params)}
      </p>
      <Button
        type="button"
        size="lg"
        data-way-on
        disabled={spec.isBlocked}
        onClick={() => onGo(way)}
        className="flex-none max-xs:flex-[1_1_100%]"
      >
        <Icon name={spec.icon} />
        {t(spec.label)}
      </Button>
    </div>
  );
}
