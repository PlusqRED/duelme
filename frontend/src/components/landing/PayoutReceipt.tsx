'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Stake } from '@/components/arena/Stake';
import { Avatar } from '@/components/identity/Avatar';
import { Icon } from '@/components/ui/icon';
import type { WonDuel } from '@/hooks/useWonDuels';
import { useTranslation } from '@/i18n/useTranslation';
import { cn, formatUSDT } from '@/lib/utils';

/**
 * Where a finished duel's money went: the two stakes, the pot the contract held, the whole of it to
 * the winner, and no fee taken. It plays left to right each time it is shown, and runs down on a
 * phone.
 */
export function PayoutReceipt({ duel }: { duel: WonDuel }) {
  const { t, language } = useTranslation();
  const stake = formatUSDT(duel.stake, language);
  const pot = formatUSDT(duel.stake * 2n, language);
  const winner = duel.winner === 'creator' ? duel.creator : duel.opponent;

  return (
    <div className="mx-3.5 mt-1.5 mb-3.5 grid gap-3.5 rounded-[18px] border border-line p-4 max-xs:mx-2 max-xs:mt-1 max-xs:mb-2.5 max-xs:p-3.5">
      <div className="grid grid-cols-[auto_minmax(20px,1fr)_auto_minmax(20px,1fr)_auto] items-center gap-2.5 max-xs:grid-cols-1 max-xs:justify-items-start max-xs:gap-2">
        <Step label={t('recent.stakes')}>
          <span className="inline-flex animate-slide-in items-center gap-1.5 [animation-delay:120ms]">
            <Avatar address={duel.creator} tone="red" className="size-[22px] inset-shadow-none" />
            <Stake side="creator" className="h-[26px] min-w-11 rounded-lg px-2 text-note">
              {stake}
            </Stake>
          </span>
          <span className="inline-flex animate-slide-in items-center gap-1.5 [animation-delay:210ms]">
            <Avatar address={duel.opponent} tone="blue" className="size-[22px] inset-shadow-none" />
            <Stake side="opponent" className="h-[26px] min-w-11 rounded-lg px-2 text-note">
              {stake}
            </Stake>
          </span>
        </Step>
        <Arrow className="[animation-delay:360ms]" />
        <Step label={t('recent.pot')}>
          <span className="inline-flex h-[34px] animate-pop items-center gap-1.5 rounded-full bg-ink px-3 font-extrabold whitespace-nowrap text-paper tabular-nums [animation-delay:560ms]">
            <Icon name="lock" className="size-[15px]" />
            {pot}
            <small className="text-[0.6875rem] font-label opacity-75">USDT</small>
          </span>
        </Step>
        <Arrow className="[animation-delay:760ms]" />
        <Step label={t('recent.toWinner')}>
          <span className="relative inline-flex h-[34px] animate-pay items-center gap-1.5 overflow-hidden rounded-full bg-sun-soft pr-3 pl-1.5 font-extrabold whitespace-nowrap tabular-nums [animation-delay:960ms]">
            <span aria-hidden="true" className="absolute inset-0 animate-pay-flash bg-sun [animation-delay:960ms]" />
            <Avatar
              address={winner}
              tone={duel.winner === 'creator' ? 'red' : 'blue'}
              className="relative size-[22px] inset-shadow-none"
            />
            <span className="relative">+{pot}</span>
            <small className="relative text-[0.6875rem] font-label opacity-75">USDT</small>
          </span>
        </Step>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <span className="text-sm text-ink-3">{t('recent.fee')}</span>
        <Link href={`/duel/${duel.id}`} className="link inline-flex min-h-11 items-center">
          {t('recent.open', { id: duel.id })}
        </Link>
      </div>
    </div>
  );
}

function Step({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-1.5">
      <span className="text-xs font-label text-ink-3">{label}</span>
      {children}
    </div>
  );
}

/** Where the money went next: across on a wide screen, down on a phone, drawn as the receipt plays. */
function Arrow({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative h-0.5 origin-left animate-draw rounded-full bg-ink',
        'after:absolute after:top-1/2 after:right-0 after:size-2 after:-translate-y-1/2 after:rotate-45 after:border-t-2 after:border-r-2 after:border-ink',
        'max-xs:ml-2.5 max-xs:h-4 max-xs:w-0.5 max-xs:origin-top max-xs:animate-draw-down',
        'max-xs:after:top-auto max-xs:after:right-auto max-xs:after:bottom-0 max-xs:after:left-1/2 max-xs:after:-translate-x-1/2 max-xs:after:translate-y-0 max-xs:after:rotate-135',
        className
      )}
    />
  );
}
