'use client';

import { useEffect, useEffectEvent } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useConfig } from 'wagmi';
import { getBalanceQueryOptions, readContractQueryOptions } from 'wagmi/query';
import { AVAILABLE_CHAINS, DEFAULT_CHAIN_ID } from '@/lib/constants';
import { balanceOfAbi } from '@/lib/contracts';
import { subscribeToBalanceRefresh } from '@/lib/balanceRefresh';
import { balanceReading, type BalanceReading } from '@/lib/walletBalances';

const BALANCE_POLL_INTERVAL = 30_000;

export type WalletNetwork = (typeof AVAILABLE_CHAINS)[number];

export interface NetworkBalances {
  chain: WalletNetwork;
  usdt: BalanceReading;
  eth: BalanceReading;
}

/**
 * The wallet's USDT and ETH on every network the app lists, each on its own, never added up: test
 * money and real money are different money. The duel network's USDT, on the wallet button, is
 * polled always; the rest only while the menu that shows them is open. Everything is read again
 * whenever a write or the faucet says a balance moved, and by `refetch` (on opening the menu, or
 * after a read failed).
 */
export function useWalletBalances(walletAddress: `0x${string}` | undefined, isOpen: boolean) {
  const config = useConfig();
  const pollWhenShown = isOpen ? BALANCE_POLL_INTERVAL : false;

  // The same query as useUsdtBalance's, so a top-up window open beside the menu shares its reads.
  const usdt = useQueries({
    queries: AVAILABLE_CHAINS.map((chain) => ({
      ...readContractQueryOptions(config, {
        address: chain.usdt,
        abi: balanceOfAbi,
        functionName: 'balanceOf',
        args: walletAddress ? [walletAddress] : undefined,
        chainId: chain.id,
      }),
      enabled: !!walletAddress,
      refetchInterval: chain.id === DEFAULT_CHAIN_ID ? BALANCE_POLL_INTERVAL : pollWhenShown,
      staleTime: 0,
    })),
  });
  const eth = useQueries({
    queries: AVAILABLE_CHAINS.map((chain) => ({
      ...getBalanceQueryOptions(config, { address: walletAddress, chainId: chain.id }),
      enabled: !!walletAddress,
      refetchInterval: pollWhenShown,
      staleTime: 0,
      select: (balance: { value: bigint }) => balance.value,
    })),
  });

  const refetch = () => {
    [...usdt, ...eth].forEach((query) => void query.refetch());
  };
  // useQueries hands back a new array every render; the subscription reads the latest one.
  const onBalanceMoved = useEffectEvent(refetch);

  useEffect(() => subscribeToBalanceRefresh(onBalanceMoved), []);

  const networks: NetworkBalances[] = AVAILABLE_CHAINS.map((chain, index) => ({
    chain,
    usdt: balanceReading(usdt[index]),
    eth: balanceReading(eth[index]),
  }));

  return { networks, refetch };
}
