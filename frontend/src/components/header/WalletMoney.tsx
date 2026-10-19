'use client';

import { useId } from 'react';
import { FaucetFlask } from '@/components/header/FaucetFlask';
import { NetworkTiles } from '@/components/header/NetworkTiles';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Note } from '@/components/ui/note';
import type { FaucetFlaskState } from '@/hooks/useFaucetFlask';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';

interface WalletMoneyProps {
  networks: NetworkBalances[];
  pickedId: number;
  onPick: (chainId: number) => void;
  faucet: FaucetFlaskState;
  onRetry: () => void;
  onTopUp: () => void;
  onSend: () => void;
  /** Back from sending: the focus returns to Send. */
  isBackFromSend: boolean;
}

/**
 * The wallet's money: the balance on each network, Top up and Send for the picked one, who pays the
 * network fee for duels, and the test faucet where there is one.
 */
export function WalletMoney({ networks, pickedId, onPick, faucet, onRetry, onTopUp, onSend, isBackFromSend }: WalletMoneyProps) {
  const { t } = useTranslation();
  const titleId = useId();
  // With relaying off, duel actions take ETH too, and the line stops promising they are free.
  const { isRelayEnabled } = useRelayerStatus(DEFAULT_CHAIN_ID);
  const hasFailedRead = networks.some((network) => network.usdt.kind === 'error' || network.eth.kind === 'error');

  return (
    <section aria-labelledby={titleId} className="grid gap-2.5">
      <h3 id={titleId} className="text-sm font-label text-ink-3">
        {t('wallet.balances')}
      </h3>
      <NetworkTiles networks={networks} pickedId={pickedId} onPick={onPick} />
      {hasFailedRead && (
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-label text-orange-ink">
          <Icon name="alert" className="size-4" />
          {t('wallet.balanceFailed')}
          <button type="button" onClick={onRetry} className="min-h-11 cursor-pointer underline underline-offset-4">
            {t('action.tryAgain')}
          </button>
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={onTopUp} className="flex-1 px-3">
          <Icon name="plus" className="size-[18px]" />
          {t('deposit.topUp')}
        </Button>
        <Button size="sm" variant="paper" onClick={onSend} autoFocus={isBackFromSend} className="flex-1 px-3">
          <Icon name="send" className="size-[18px]" />
          {t('wallet.send')}
        </Button>
      </div>
      <Note icon={isRelayEnabled ? 'check' : 'fuel'} tone={isRelayEnabled ? 'good' : 'plain'}>
        {t(isRelayEnabled ? 'wallet.fees' : 'wallet.fees.self')}
      </Note>
      <div aria-live="polite" className="empty:hidden">
        <FaucetFlask phase={faucet.phase} offer={faucet.offer} onClaim={() => void faucet.claim()} onPoured={faucet.settle} />
      </div>
    </section>
  );
}
