'use client';

import { useState } from 'react';
import type { SignItem } from '@/components/sign/signingModel';
import type { EthNeed } from '@/components/sign/NeedsList';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useEthBalance } from '@/hooks/useEthBalance';
import { useFaucetFlask } from '@/hooks/useFaucetFlask';
import { useFeeQuote } from '@/hooks/useFeeQuote';
import { useTranslation } from '@/i18n/useTranslation';
import { faucetGift } from '@/lib/faucetApi';
import type { FlaskPhase } from '@/lib/faucetFlask';
import { ethNeeded, expectedFee, type GasKind } from '@/lib/gasNeeds';
import type { WriteRoute } from '@/lib/writeRoute';

interface UseSignGasOptions {
  open: boolean;
  chainId: number;
  route: WriteRoute;
  /** The transactions the wallet still has to send and pay for. */
  unpaid: readonly SignItem[];
}

/** What the main button does about ETH the wallet lacks: the test faucet, or the top-up window. */
export type GasFix = 'faucet' | 'topUpEth';

const FAUCET_LEVELS: Partial<Record<FlaskPhase, NonNullable<EthNeed['faucet']>['level']>> = {
  asking: 'filling',
  sent: 'full',
  landed: 'pouring',
};

/**
 * The network fee on the self-paid path: what each transaction should cost now, the ETH the wallet
 * must hold for the ones it has not sent yet against what it holds, and what to do when it is short
 * — the faucet on a test network while it still gives, the top-up window otherwise. The relayed
 * path pays nothing, so it reads nothing.
 */
export function useSignGas({ open, chainId, route, unpaid }: UseSignGasOptions) {
  const { t, language } = useTranslation();
  const paysGas = open && route === 'self';
  const { walletAddress } = useActiveWallet();
  const quote = useFeeQuote(chainId, paysGas);
  const { reading, refetch: retryEth } = useEthBalance(chainId, walletAddress, paysGas);
  const ethRaw = reading.kind === 'ready' ? reading.raw : null;
  // The flask follows the ETH the faucet sends, since ETH is what this window is short of.
  const faucet = useFaucetFlask(chainId, ethRaw);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const kinds = unpaid.flatMap((item) => Array<GasKind>(item.gasTimes ?? 1).fill(item.gas));
  const needWei = quote && kinds.length > 0 ? ethNeeded(kinds, chainId, quote) : null;
  const isShort = needWei !== null && ethRaw !== null && ethRaw < needWei;
  const level = FAUCET_LEVELS[faucet.phase];
  const isFaucetBusy = faucet.phase === 'asking' || faucet.phase === 'sent' || faucet.phase === 'landed';
  // A faucet that gives no ETH cannot pay a fee, and a claim of it would never be seen landing.
  const faucetHelps = faucet.offer.kind !== 'none' && faucet.offer.ethAmountWei > 0n && faucet.phase !== 'claimed';
  const fix: GasFix | null = !paysGas || (!isShort && !isFaucetBusy) ? null : faucetHelps ? 'faucet' : 'topUpEth';

  const note =
    faucet.offer.kind === 'none'
      ? null
      : faucet.phase === 'asking'
        ? t('wallet.faucet.asking')
        : faucet.phase === 'sent'
          ? t('wallet.faucet.sent', { gift: faucetGift(faucet.offer, language, t) })
          : null;

  const eth: EthNeed | undefined =
    paysGas && needWei !== null
      ? {
          needWei,
          balance: reading,
          faucet: level && { level, note, onPoured: faucet.settle },
        }
      : undefined;

  return {
    eth,
    fix,
    isFaucetBusy,
    /** What a transaction of this kind should cost now, or null until the network has said. */
    feeOf: (kind: GasKind): bigint | null => (quote ? expectedFee(kind, quote) : null),
    claimFaucet: () => void faucet.claim(),
    retryEth,
    isTopUpOpen: paysGas && isTopUpOpen,
    openTopUp: () => setIsTopUpOpen(true),
    closeTopUp: () => setIsTopUpOpen(false),
  };
}
