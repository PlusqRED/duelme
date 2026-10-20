'use client';

import type { ReactNode } from 'react';
import { Flask, type FlaskLevel } from '@/components/header/FaucetFlask';
import { ChargeCells } from '@/components/sign/ChargeCells';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import type { BalanceReading, BalanceStatus } from '@/lib/balanceStatus';
import type { SeatSide } from '@/lib/duel';
import { formatEthBalance, formatEthNeed } from '@/lib/gasNeeds';
import { cn, formatUSDT } from '@/lib/utils';

/** The stake leaving the wallet. */
export interface UsdtNeed {
  /** In USDT's smallest unit. */
  needRaw: bigint;
  balance: BalanceStatus;
  side: SeatSide;
  /** The balance before money landed, so the newly covered cells charge. */
  fromRaw?: bigint;
}

/** The network fee the wallet pays itself, with the faucet's flask while it fills the wallet. */
export interface EthNeed {
  needWei: bigint;
  balance: BalanceReading;
  faucet?: { level: FlaskLevel; note: string | null; onPoured?: () => void };
}

interface NeedsListProps {
  usdt?: UsdtNeed;
  eth?: EthNeed;
  className?: string;
}

type Tone = 'enough' | 'short' | 'checking';

const ROW =
  'grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-[9px] rounded-2xl px-3.5 py-2.5 transition-[background-color,box-shadow] duration-300 max-[459px]:grid-cols-[36px_minmax(0,1fr)] max-[459px]:gap-y-1.5';

const TONES: Record<Tone, string> = {
  enough: 'bg-canvas',
  short: 'bg-orange-wash ring-[1.5px] ring-orange-line ring-inset',
  checking: 'bg-canvas',
};

const SEAT_MARKS: Record<SeatSide, string> = {
  creator: 'bg-red-soft text-red-deep',
  opponent: 'bg-blue-soft text-blue-deep',
};

/**
 * What a signature needs from the wallet before it is asked anything: the stake, with what the
 * wallet holds and the cells it covers, and the network fee when the wallet pays one. Each row
 * says whether the wallet has enough; a figure still being read shows an ellipsis and no verdict.
 */
export function NeedsList({ usdt, eth, className }: NeedsListProps) {
  return (
    <ul className={cn('grid gap-2', className)}>
      {usdt && <UsdtRow need={usdt} />}
      {eth && <EthRow need={eth} />}
    </ul>
  );
}

function UsdtRow({ need }: { need: UsdtNeed }) {
  const { t, language } = useTranslation();
  const raw = need.balance.kind === 'ready' ? need.balance.raw : null;
  const shortRaw = raw !== null && raw < need.needRaw ? need.needRaw - raw : 0n;
  const tone: Tone = raw === null ? 'checking' : shortRaw > 0n ? 'short' : 'enough';
  const have = raw !== null ? formatUSDT(raw, language) : need.balance.kind === 'checking' ? '…' : '—';

  return (
    <li data-tone={tone} className={cn(ROW, TONES[tone])}>
      <Mark className={SEAT_MARKS[need.side]}>
        <Icon name="wallet" className="size-[19px]" />
      </Mark>
      <Figures
        amount={t('sign.need.usdt', { wager: formatUSDT(need.needRaw, language) })}
        have={t('sign.need.usdt.have', { have })}
      />
      {tone === 'enough' && <Status tone="enough">{t('sign.need.enough')}</Status>}
      {tone === 'short' && <Status tone="short">{t('topup.short', { amount: formatUSDT(shortRaw, language) })}</Status>}
      {need.balance.kind === 'error' && <Status tone="short">{t('wallet.balanceFailed')}</Status>}
      {need.balance.kind === 'no-wallet' && <Status tone="short">{t('toast.walletNotReady')}</Status>}
      <span className="col-span-2 col-start-2 max-[459px]:col-span-2 max-[459px]:col-start-1">
        {raw === null ? (
          <span aria-hidden="true" className="grid h-3.5 grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, index) => (
              <i key={index} className="rounded-[4px] bg-line" />
            ))}
          </span>
        ) : (
          <ChargeCells haveRaw={raw} needRaw={need.needRaw} side={need.side} fromRaw={need.fromRaw} />
        )}
      </span>
    </li>
  );
}

function EthRow({ need }: { need: EthNeed }) {
  const { t, language } = useTranslation();
  const raw = need.balance.kind === 'ready' ? need.balance.raw : null;
  const enough = raw !== null && raw >= need.needWei;
  const have = raw !== null ? formatEthBalance(raw, language) : need.balance.kind === 'checking' ? '…' : '—';
  const faucet = need.faucet;
  const tone: Tone = raw === null ? 'checking' : enough && !faucet ? 'enough' : 'short';

  return (
    <li
      data-tone={tone}
      data-phase={faucet?.level}
      className={cn(ROW, faucet ? 'grid-cols-[36px_minmax(0,1fr)] bg-good-soft' : TONES[tone])}
    >
      <Mark className={faucet ? 'bg-transparent' : 'bg-paper text-ink-2'}>
        {faucet ? (
          <Flask level={faucet.level} onPoured={faucet.onPoured} className="size-9 rounded-[11px] bg-paper p-[3px]" />
        ) : (
          <Icon name="fuel" className="size-[19px]" />
        )}
      </Mark>
      <Figures amount={t('sign.need.eth', { eth: formatEthNeed(need.needWei, language) })} have={t('sign.need.eth.have', { have })} />
      {faucet ? (
        faucet.note && <p className="col-start-2 -mt-1 text-sm font-label text-good-ink">{faucet.note}</p>
      ) : raw !== null ? (
        <Status tone={enough ? 'enough' : 'short'}>{t(enough ? 'sign.need.enough' : 'topup.eth.short')}</Status>
      ) : (
        need.balance.kind === 'error' && <Status tone="short">{t('wallet.balanceFailed')}</Status>
      )}
    </li>
  );
}

function Mark({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={cn('row-span-2 grid size-9 place-items-center self-start rounded-[11px]', className)}>{children}</span>
  );
}

function Figures({ amount, have }: { amount: string; have: string }) {
  return (
    <span className="grid min-w-0 leading-[1.3]">
      <b className="font-strong tabular-nums">{amount}</b>
      <small className="text-note text-ink-3 tabular-nums">{have}</small>
    </span>
  );
}

function Status({ tone, children }: { tone: 'enough' | 'short'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[5px] text-right text-sm font-strong max-[459px]:col-start-2 max-[459px]:justify-self-start max-[459px]:text-left',
        tone === 'enough' ? 'text-good-ink' : 'text-orange-ink'
      )}
    >
      {tone === 'enough' && <Icon name="check" className="size-4 stroke-[2.6]" />}
      {children}
    </span>
  );
}
