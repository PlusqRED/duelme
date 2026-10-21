'use client';

import { useState } from 'react';
import { QuietButton } from '@/components/header/QuietButton';
import { SendForm } from '@/components/header/SendForm';
import { SendProgress } from '@/components/header/SendProgress';
import { SendReview } from '@/components/header/SendReview';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useSendUsdt } from '@/hooks/useSendUsdt';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { useTranslation } from '@/i18n/useTranslation';
import type { FaucetOffer } from '@/lib/faucetApi';
import { sendStage, type SendDraft, type Transfer } from '@/lib/sendUsdt';
import { formatUSDT } from '@/lib/utils';
import { EMBEDDED_WALLET_CLIENT_TYPE } from '@/lib/walletSelection';
import { readingFigure } from '@/lib/walletBalances';

interface SendViewProps {
  /** Checksummed: the wallet the money leaves. */
  address: string;
  /** The network picked in the wallet: the money goes out on it. */
  network: NetworkBalances;
  /** What the faucet offers, for the wallet with no ETH for the fee. */
  faucetOffer: FaucetOffer;
  onBack: () => void;
}

/**
 * Sending USDT out: the form, a last look at the transfer, then the transfer on its way from your
 * wallet to the address.
 */
export function SendView({ address, network, faucetOffer, onBack }: SendViewProps) {
  const { t, language } = useTranslation();
  const { activeWallet } = useActiveWallet();
  const [draft, setDraft] = useState<SendDraft>({ to: '', amount: '' });
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [isSent, setIsSent] = useState(false);
  const sending = useSendUsdt(network.chain.id);

  function send(next: Transfer) {
    setIsSent(true);
    void sending.send(next.to, next.raw);
  }

  function retry() {
    sending.reset();
    setIsSent(false);
    setTransfer(null);
  }

  return (
    <>
      <QuietButton icon="arrow-left" onClick={onBack} autoFocus className="-mt-2 -mb-1.5 justify-self-start">
        {t('send.back')}
      </QuietButton>
      <div className="grid gap-0.5">
        <h3 className="text-xl font-extrabold tracking-[-0.02em]">{t('send.title')}</h3>
        <p className="text-body-sm text-ink-2">
          {t('send.from', { network: network.chain.name, amount: readingFigure(network.usdt, (raw) => formatUSDT(raw, language)) })}
        </p>
      </div>
      {transfer === null ? (
        <SendForm
          address={address}
          network={network}
          faucetOffer={faucetOffer}
          draft={draft}
          onDraft={setDraft}
          onSubmit={setTransfer}
        />
      ) : !isSent ? (
        <SendReview from={address} transfer={transfer} network={network.chain} onSend={() => send(transfer)} onEdit={() => setTransfer(null)} />
      ) : (
        <SendProgress
          stage={sendStage(sending)}
          from={address}
          transfer={transfer}
          network={network.chain}
          hash={sending.hash}
          error={sending.error}
          isInAppWallet={activeWallet?.walletClientType === EMBEDDED_WALLET_CLIENT_TYPE}
          onDone={onBack}
          onRetry={retry}
        />
      )}
    </>
  );
}
