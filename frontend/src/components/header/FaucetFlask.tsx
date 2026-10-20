'use client';

import { useId } from 'react';
import { Icon } from '@/components/ui/icon';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { faucetGift, type FaucetOffer } from '@/lib/faucetApi';
import type { FlaskPhase } from '@/lib/faucetFlask';
import { cn } from '@/lib/utils';

/** The phases the flask is a button in: before the claim, and while it is answered and on its way. */
type ClaimPhase = Extract<FlaskPhase, 'ready' | 'asking' | 'sent'>;

const CLAIM_LEVEL: Record<ClaimPhase, FlaskLevel> = { ready: 'low', asking: 'filling', sent: 'full' };
const CLAIM_NOTE: Record<ClaimPhase, TranslationKey> = {
  ready: 'wallet.faucet.note',
  asking: 'wallet.faucet.asking',
  sent: 'wallet.faucet.sent',
};

interface FaucetFlaskProps {
  phase: FlaskPhase;
  offer: FaucetOffer;
  onClaim: () => void;
  /** The money has poured into the balance. */
  onPoured: () => void;
}

/**
 * The test faucet, once per wallet: a flask that fills while the faucet answers, bubbles while the
 * money is on its way, and pours out into the balance when it lands.
 */
export function FaucetFlask({ phase, offer, onClaim, onPoured }: FaucetFlaskProps) {
  const { t, language } = useTranslation();
  if (phase === 'hidden' || offer.kind === 'none') {
    return null;
  }
  const gift = { gift: faucetGift(offer, language, t) };

  if (phase === 'landed' || phase === 'claimed') {
    const isPouring = phase === 'landed';
    return (
      <p className="grid min-h-[60px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-tile bg-good-soft py-2.5 pr-3.5 pl-2.5 text-sm font-label text-good-ink">
        <Flask level={isPouring ? 'pouring' : 'empty'} onPoured={onPoured} className="bg-paper" />
        <span>{t('wallet.faucet.done', gift)}</span>
        <Icon name="check" className={cn('size-5 stroke-[2.6]', isPouring && 'animate-pop [animation-delay:0.6s]')} />
      </p>
    );
  }

  // Still focusable while it works, so the focus stays on it.
  const isBusy = phase === 'asking' || phase === 'sent';
  return (
    <button
      type="button"
      onClick={isBusy ? undefined : onClaim}
      aria-disabled={isBusy || undefined}
      className="grid min-h-[60px] w-full cursor-pointer grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 rounded-tile border-[1.5px] border-dashed border-line-strong bg-paper py-2.5 pr-3.5 pl-2.5 text-left text-ink transition-colors hover:border-good aria-disabled:cursor-default aria-disabled:border-solid aria-disabled:border-good-soft"
    >
      <Flask level={CLAIM_LEVEL[phase]} />
      <span className="grid gap-px">
        <b className="text-body-sm font-bold">{t('wallet.faucet')}</b>
        <small className="text-note text-pretty text-ink-3">{t(CLAIM_NOTE[phase], gift)}</small>
      </span>
    </button>
  );
}

type FlaskLevel = 'low' | 'filling' | 'full' | 'pouring' | 'empty';

/** How far down the liquid sits in the 32-unit flask: low while waiting, high once filled. */
const LEVELS: Record<FlaskLevel, string> = {
  low: 'translate-y-[19px]',
  filling: 'translate-y-[9px] animate-flask-fill',
  full: 'translate-y-[9px]',
  pouring: 'translate-y-[30px] animate-flask-pour',
  empty: 'translate-y-[30px]',
};

interface FlaskProps {
  level: FlaskLevel;
  onPoured?: () => void;
  className?: string;
}

function Flask({ level, onPoured, className }: FlaskProps) {
  const inside = useId();
  const isSloshing = level === 'filling' || level === 'full';

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-10 overflow-visible rounded-xl bg-good-soft p-1', className)}>
      <clipPath id={inside}>
        <path d="M13.2 6h5.6v7.4l6.4 10.9a2.4 2.4 0 0 1-2.1 3.7H9a2.4 2.4 0 0 1-2.1-3.7l6.3-10.9z" />
      </clipPath>
      <g clipPath={`url(#${inside})`}>
        <g className={LEVELS[level]} onAnimationEnd={level === 'pouring' ? onPoured : undefined}>
          <path
            className={cn('fill-good', isSloshing && 'animate-flask-wave')}
            d="M-16 2q4-2.6 8 0t8 0 8 0 8 0 8 0 8 0 8 0V40H-16z"
          />
        </g>
        {level === 'full' && (
          <>
            <circle className="animate-flask-bubble fill-paper/85 opacity-0" cx="14" cy="24" r="1.4" />
            <circle className="animate-flask-bubble fill-paper/85 opacity-0 [animation-delay:0.5s]" cx="18.5" cy="25" r="1" />
          </>
        )}
      </g>
      <path
        className="fill-none stroke-good-ink"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5h8M13.2 5v8.4L6.9 24.3A2.4 2.4 0 0 0 9 28h14.1a2.4 2.4 0 0 0 2.1-3.7l-6.4-10.9V5"
      />
    </svg>
  );
}
