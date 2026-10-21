'use client';

import { useState } from 'react';
import { useUsdtBalance } from '@/hooks/useUsdtBalance';
import { useWalletBalances } from '@/hooks/useWalletBalances';
import type { BalanceReading } from '@/lib/balanceStatus';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';

/** The balance the panel shows, and what it was before money last landed. */
interface ShownBalance {
  raw: bigint | null;
  fromRaw?: bigint;
}

export interface StakePurse {
  /** The wallet's USDT on the duel's network, as read now. */
  balance: BalanceReading;
  /** The balance the page shows: it keeps still while the top-up window is open. */
  shown: BalanceReading;
  /** The balance before money landed, so the stake's cells charge from it once. */
  fromRaw: bigint | undefined;
  /** USDT the wallet lacks for the stake; zero while it holds enough or is not known yet. */
  shortRaw: bigint;
  /** Money landed that covers the stake now: Join takes Top up's place. */
  isCovered: boolean;
  isTopUpOpen: boolean;
  openTopUp: () => void;
  closeTopUp: () => void;
  retry: () => void;
}

/**
 * The stake against the reader's wallet while they could join: the duel network's USDT, how much is
 * short, and the top-up window over the page. Money that lands while the window is open waits for it
 * to close, as the window says what arrived; then the cells charge from the balance before it.
 */
export function useStakePurse(walletAddress: `0x${string}` | undefined, stakeRaw: bigint, isShown: boolean): StakePurse {
  const reader = isShown ? walletAddress : undefined;
  const { networks, refetch } = useWalletBalances(reader, false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  // A player waiting for a transfer to land watches the window: it polls as fast as the window's own read.
  useUsdtBalance(DEFAULT_CHAIN_ID, reader, isTopUpOpen);

  const balance = networks.find((network) => network.chain.id === DEFAULT_CHAIN_ID)?.usdt ?? { kind: 'checking' };
  const liveRaw = balance.kind === 'ready' ? balance.raw : null;
  const [shown, setShown] = useState<ShownBalance>({ raw: liveRaw });
  if (!isTopUpOpen && liveRaw !== shown.raw) {
    const hasGrown = shown.raw !== null && liveRaw !== null && liveRaw > shown.raw;
    setShown({ raw: liveRaw, fromRaw: hasGrown && shown.raw !== null ? shown.raw : undefined });
  }

  const shortRaw = shown.raw === null || shown.raw >= stakeRaw ? 0n : stakeRaw - shown.raw;
  return {
    balance,
    shown: shown.raw === null ? balance : { kind: 'ready', raw: shown.raw },
    fromRaw: shown.fromRaw,
    shortRaw,
    isCovered: shown.fromRaw !== undefined && shown.fromRaw < stakeRaw && shortRaw === 0n,
    isTopUpOpen,
    openTopUp: () => setIsTopUpOpen(true),
    closeTopUp: () => setIsTopUpOpen(false),
    retry: refetch,
  };
}
