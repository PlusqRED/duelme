'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { useFaucetClaim } from '@/hooks/useFaucetClaim';
import { useTranslation } from '@/i18n/useTranslation';
import { faucetGift } from '@/lib/faucetApi';

interface TopUpFaucetProps {
  chainId: number;
}

/**
 * The test faucet in the top-up window, where it gives: a claim to make once, then what it sent.
 * Mount it with `key={chainId}`, so a claim made on one network is never shown on another.
 */
export function TopUpFaucet({ chainId }: TopUpFaucetProps) {
  const { t, language } = useTranslation();
  const { offer, isClaiming, claim } = useFaucetClaim(chainId);
  // The faucet said yes before its status says so: the claim is made, not to be offered again.
  const [isSent, setIsSent] = useState(false);

  if (offer.kind === 'none') {
    return null;
  }
  const gift = { gift: faucetGift(offer, language, t) };

  if (offer.kind === 'claimed' || isSent) {
    return (
      <p className="flex min-h-12 items-center gap-[7px] font-bold text-good-ink">
        <Icon name="check" className="size-[18px] stroke-[2.6]" />
        {t('wallet.faucet.done', gift)}
      </p>
    );
  }

  async function ask() {
    if (await claim()) {
      setIsSent(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
      <Button type="button" variant="paper" onClick={() => void ask()} disabled={isClaiming} focusableWhenDisabled data-initial-focus>
        {isClaiming ? <Spinner /> : <Icon name="plus" />}
        {t('wallet.faucet')}
      </Button>
      <p className="text-sm text-pretty text-ink-3">{t('wallet.faucet.note', gift)}</p>
    </div>
  );
}
