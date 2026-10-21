'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Stake } from '@/components/arena/Stake';
import { Avatar } from '@/components/identity/Avatar';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import type { SeatSide } from '@/lib/duel';
import type { FeedDuel, FeedMoney } from '@/lib/duelFeed';
import { cn, formatUSDT } from '@/lib/utils';

interface DuelReceiptProps {
  duel: FeedDuel;
  money: FeedMoney;
  /** Whose the pot is, once the duel is won. */
  winner: SeatSide | null;
}

/**
 * Where a duel's money went, or is: the two stakes, the pot the contract holds, then the whole of it
 * to the winner, a winner still to come while the duel is played, or each stake back to its player;
 * and no fee taken. It plays left to right each time it is shown, and runs down on a phone.
 */
export function DuelReceipt({ duel, money, winner }: DuelReceiptProps) {
  const { t, language } = useTranslation();
  const stake = formatUSDT(duel.wagerAmount, language);
  const pot = formatUSDT(duel.wagerAmount * 2n, language);

  return (
    <div className="mx-3.5 mt-1.5 mb-3.5 grid gap-3.5 rounded-[18px] border border-line p-4 max-xs:mx-2 max-xs:mt-1 max-xs:mb-2.5 max-xs:p-3.5">
      <div className="grid grid-cols-[auto_minmax(20px,1fr)_auto_minmax(20px,1fr)_auto] items-center gap-2.5 max-xs:grid-cols-1 max-xs:justify-items-start max-xs:gap-2">
        <Step label={t('recent.stakes')}>
          <StakeFrom address={duel.player1} side="creator" amount={stake} className="[animation-delay:120ms]" />
          <StakeFrom address={duel.player2} side="opponent" amount={stake} className="[animation-delay:210ms]" />
        </Step>
        <Arrow className="[animation-delay:360ms]" />
        <Step label={t('recent.pot')}>
          <span className="inline-flex h-[34px] animate-pop items-center gap-1.5 rounded-full bg-ink px-3 font-extrabold whitespace-nowrap text-paper tabular-nums [animation-delay:560ms]">
            <Icon name="lock" className="size-[15px]" />
            {pot}
            <small className="text-micro font-label opacity-75">USDT</small>
          </span>
        </Step>
        <Arrow className="[animation-delay:760ms]" isPending={money === 'held'} />
        {money === 'back' ? (
          <Step label={t('recent.backToEach')}>
            <StakeFrom address={duel.player1} side="creator" amount={`+${stake}`} className="[animation-delay:960ms]" />
            <StakeFrom address={duel.player2} side="opponent" amount={`+${stake}`} className="[animation-delay:1050ms]" />
          </Step>
        ) : (
          <Step label={t('recent.toWinner')}>
            {winner ? <Payout duel={duel} winner={winner} pot={pot} /> : <PayoutToCome pot={pot} />}
          </Step>
        )}
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

interface StakeFromProps {
  address: string;
  side: SeatSide;
  amount: string;
  className: string;
}

/** A player's stake beside their face, sliding in: on its way to the pot, or back from it. */
function StakeFrom({ address, side, amount, className }: StakeFromProps) {
  return (
    <span className={cn('inline-flex animate-slide-in items-center gap-1.5', className)}>
      <Avatar address={address} tone={side === 'creator' ? 'red' : 'blue'} className="size-[22px] inset-shadow-none" />
      <Stake side={side} className="h-[26px] min-w-11 rounded-lg px-2 text-note">
        {amount}
      </Stake>
    </span>
  );
}

function Payout({ duel, winner, pot }: { duel: FeedDuel; winner: SeatSide; pot: string }) {
  return (
    <span className="relative inline-flex h-[34px] animate-pay items-center gap-1.5 overflow-hidden rounded-full bg-sun-soft pr-3 pl-1.5 font-extrabold whitespace-nowrap tabular-nums [animation-delay:960ms]">
      <span aria-hidden="true" className="absolute inset-0 animate-pay-flash bg-sun [animation-delay:960ms]" />
      <Avatar
        address={winner === 'creator' ? duel.player1 : duel.player2}
        tone={winner === 'creator' ? 'red' : 'blue'}
        className="relative size-[22px] inset-shadow-none"
      />
      <span className="relative">+{pot}</span>
      <small className="relative text-micro font-label opacity-75">USDT</small>
    </span>
  );
}

/** The pot's place while the duel is played: an outline in the winner's sun, the seat in it still empty. */
function PayoutToCome({ pot }: { pot: string }) {
  return (
    <span className="inline-flex h-[34px] animate-pop items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-sun-edge pr-3 pl-1 font-extrabold whitespace-nowrap text-sun-ink tabular-nums [animation-delay:960ms]">
      <span aria-hidden="true" className="grid size-[24px] place-items-center rounded-full border-[1.5px] border-dashed border-sun-edge">
        <Icon name="trophy" className="size-[13px]" />
      </span>
      +{pot}
      <small className="text-micro font-label opacity-75">USDT</small>
    </span>
  );
}

interface ArrowProps {
  className: string;
  /** The money has not gone this way yet: the arrow is drawn dashed. */
  isPending?: boolean;
}

/** Where the money went next: across on a wide screen, down on a phone, drawn as the receipt plays. */
function Arrow({ className, isPending = false }: ArrowProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative h-0.5 origin-left animate-draw rounded-full bg-ink',
        'after:absolute after:top-1/2 after:right-0 after:size-2 after:-translate-y-1/2 after:rotate-45 after:border-t-2 after:border-r-2 after:border-ink',
        'max-xs:ml-2.5 max-xs:h-4 max-xs:w-0.5 max-xs:origin-top max-xs:animate-draw-down',
        'max-xs:after:top-auto max-xs:after:right-auto max-xs:after:bottom-0 max-xs:after:left-1/2 max-xs:after:-translate-x-1/2 max-xs:after:translate-y-0 max-xs:after:rotate-135',
        isPending && 'bg-transparent bg-[repeating-linear-gradient(90deg,var(--color-ink-3)_0_6px,transparent_6px_11px)] after:border-ink-3 max-xs:bg-[repeating-linear-gradient(180deg,var(--color-ink-3)_0_5px,transparent_5px_9px)]',
        className
      )}
    />
  );
}
