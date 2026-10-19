'use client';

import { useState } from 'react';
import { SendForm } from '@/components/header/SendForm';
import { SendProgress } from '@/components/header/SendProgress';
import { Icon } from '@/components/ui/icon';
import { useSendUsdt } from '@/hooks/useSendUsdt';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { useTranslation } from '@/i18n/useTranslation';
import type { FaucetOffer } from '@/lib/faucetApi';
import { sendStage, type SendDraft, type Transfer } from '@/lib/sendUsdt';
import { formatUSDT } from '@/lib/utils';
import { readingRaw } from '@/lib/walletBalances';

interface SendViewProps {
  /** Checksummed: the wallet the money leaves. */
  address: string;
  /** The network picked in the wallet: the money goes out on it. */
  network: NetworkBalances;
  /** What the faucet offers, for the wallet with no ETH for the fee. */
  faucetOffer: FaucetOffer;
  onBack: () => void;
}

/** Sending USDT out: the form, then the transfer on its way from your wallet to the address. */
export function SendView({ address, network, faucetOffer, onBack }: SendViewProps) {
  const { t, language } = useTranslation();
  const [draft, setDraft] = useState<SendDraft>({ to: '', amount: '' });
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const sending = useSendUsdt(network.chain.id);
  const stage = sendStage(transfer !== null, sending);
  const usdtRaw = readingRaw(network.usdt);

  function submit(next: Transfer) {
    setTransfer(next);
    void sending.send(next.to, next.raw);
  }

  function retry() {
    sending.reset();
    setTransfer(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        autoFocus
        className="-mt-2 -mb-1.5 inline-flex min-h-11 cursor-pointer items-center gap-[7px] justify-self-start text-body-sm font-label text-ink-2 transition-colors hover:text-ink"
      >
        <Icon name="arrow-left" className="size-[18px]" />
        {t('send.back')}
      </button>
      <div className="grid gap-0.5">
        <h3 className="text-xl font-extrabold tracking-[-0.02em]">{t('send.title')}</h3>
        <p className="text-body-sm text-ink-2">
          {t('send.from', { network: network.chain.name, amount: usdtRaw === null ? '…' : formatUSDT(usdtRaw, language) })}
        </p>
      </div>
      {transfer === null || stage === 'form' ? (
        <SendForm
          address={address}
          network={network}
          faucetOffer={faucetOffer}
          draft={draft}
          onDraft={setDraft}
          onSubmit={submit}
        />
      ) : (
        <SendProgress
          stage={stage}
          from={address}
          transfer={transfer}
          network={network.chain}
          hash={sending.hash}
          error={sending.error}
          onDone={onBack}
          onRetry={retry}
        />
      )}
    </>
  );
}
