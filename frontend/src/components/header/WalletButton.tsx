'use client';

import { GainRing } from '@/components/header/GainRing';
import { Avatar } from '@/components/identity/Avatar';
import { Icon } from '@/components/ui/icon';
import { PopoverTrigger } from '@/components/ui/popover';
import { useBalanceFigure } from '@/hooks/useBalanceFigure';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { useTranslation } from '@/i18n/useTranslation';
import { formatUSDT } from '@/lib/utils';

interface WalletButtonProps {
  address: string;
  /** The network duels run on: the balance the button shows. */
  network: NetworkBalances;
}

/**
 * Opens the wallet menu: your face and your USDT on the network duels run on, never a sum across
 * networks. The figure counts to a new balance, and money coming in rings the button green once.
 */
export function WalletButton({ address, network }: WalletButtonProps) {
  const { t, language } = useTranslation();
  const { raw, figure, change } = useBalanceFigure(network.usdt);

  return (
    <PopoverTrigger
      aria-label={raw === null ? t('wallet.title') : t('wallet.open', { amount: formatUSDT(raw, language), network: network.chain.name })}
      className="group relative inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-paper pr-3 pl-[5px] text-body-sm text-ink transition-colors hover:border-line-strong data-popup-open:border-line-strong 2xs:pr-2.5"
    >
      <Avatar address={address} tone="ink" className="size-8 inset-shadow-none" />
      <span className="inline-flex items-baseline gap-1 tabular-nums">
        <b className="font-strong">{figure}</b>
        <small className="text-xs font-label text-ink-3 max-xs:hidden">USDT</small>
      </span>
      <Icon
        name="chevron"
        className="size-4 text-ink-3 transition-[rotate] duration-300 ease-spring group-data-popup-open:rotate-180 max-2xs:hidden"
      />
      {change && change.delta > 0n && <GainRing key={change.id} className="-inset-px rounded-full border" />}
    </PopoverTrigger>
  );
}
