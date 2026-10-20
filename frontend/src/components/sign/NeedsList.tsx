'use client';

import { ChargeCells } from '@/components/sign/ChargeCells';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import type { BalanceStatus } from '@/lib/balanceStatus';
import type { SeatSide } from '@/lib/duel';
import { cn, formatUSDT } from '@/lib/utils';

interface UsdtNeed {
  /** The stake, in USDT's smallest unit. */
  needRaw: bigint;
  balance: BalanceStatus;
  side: SeatSide;
  /** The balance before money landed, for the cells to charge from. */
  fromRaw?: bigint;
}

interface NeedsListProps {
  usdt?: UsdtNeed;
  className?: string;
}

const markTones: Record<SeatSide, string> = {
  creator: 'bg-red-soft text-red-deep',
  opponent: 'bg-blue-soft text-blue-deep',
};

/** What a signature needs from the wallet, one row per thing it has to hold, before anything is asked of it. */
export function NeedsList({ usdt, className }: NeedsListProps) {
  return <ul className={cn('grid gap-2', className)}>{usdt && <UsdtRow {...usdt} />}</ul>;
}

/**
 * The stake leaving the wallet: what it takes, what the wallet holds, enough or how much is short,
 * and the stake as cells. Until the balance is read it says so and judges nothing.
 */
function UsdtRow({ needRaw, balance, side, fromRaw }: UsdtNeed) {
  const { t, language } = useTranslation();
  const haveRaw = balance.kind === 'ready' ? balance.raw : null;
  const shortRaw = haveRaw === null || haveRaw >= needRaw ? 0n : needRaw - haveRaw;
  const tone = haveRaw === null ? undefined : shortRaw > 0n ? 'short' : 'enough';
  const have = haveRaw !== null ? formatUSDT(haveRaw, language) : balance.kind === 'error' ? '—' : '…';

  return (
    <li
      data-tone={tone}
      className={cn(
        'grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-[9px] rounded-2xl bg-canvas px-3.5 py-2.5 transition-colors duration-300 [grid-template-areas:"mark_text_status"_"mark_cells_cells"]',
        'data-[tone=short]:bg-orange-wash data-[tone=short]:shadow-[inset_0_0_0_1.5px_var(--color-orange-line)]',
        'max-[459px]:grid-cols-[36px_minmax(0,1fr)] max-[459px]:gap-y-1.5 max-[459px]:[grid-template-areas:"mark_text"_"mark_status"_"cells_cells"]'
      )}
    >
      <span className={cn('grid size-9 place-items-center self-start rounded-[11px] [grid-area:mark]', markTones[side])}>
        <Icon name="wallet" className="size-[19px]" />
      </span>
      <span className="grid min-w-0 leading-[1.3] [grid-area:text]">
        <b className="font-strong tabular-nums">{t('sign.need.usdt', { wager: formatUSDT(needRaw, language) })}</b>
        <small className="text-note/[1.3] text-ink-3 tabular-nums">{t('sign.need.usdt.have', { have })}</small>
      </span>
      {tone && (
        <span
          className={cn(
            'inline-flex items-center gap-[5px] text-right text-sm font-strong [grid-area:status] max-[459px]:justify-self-start max-[459px]:text-left',
            tone === 'short' ? 'text-orange-ink' : 'text-good-ink'
          )}
        >
          {tone === 'enough' && <Icon name="check" className="size-4 stroke-[2.6]" />}
          {tone === 'short' ? t('topup.short', { amount: formatUSDT(shortRaw, language) }) : t('sign.need.enough')}
        </span>
      )}
      <ChargeCells haveRaw={haveRaw ?? 0n} needRaw={needRaw} side={side} fromRaw={fromRaw} className="[grid-area:cells]" />
    </li>
  );
}
