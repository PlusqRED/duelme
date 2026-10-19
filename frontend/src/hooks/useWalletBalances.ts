'use client';

import { useEffect, useEffectEvent, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useConfig, useReadContracts } from 'wagmi';
import { getBalanceQueryOptions } from 'wagmi/query';
import { AVAILABLE_CHAINS } from '@/lib/constants';
import { balanceOfAbi } from '@/lib/contracts';
import { subscribeToBalanceRefresh } from '@/lib/balanceRefresh';
import { ethReading, usdtReadings, type BalanceReading } from '@/lib/walletBalances';

const BALANCE_POLL_INTERVAL = 30_000;

export type WalletNetwork = (typeof AVAILABLE_CHAINS)[number];

export interface NetworkBalances {
  chain: WalletNetwork;
  usdt: BalanceReading;
  eth: BalanceReading;
}

/**
 * The wallet's USDT and ETH on every network the app lists, each on its own, never added up: test
 * money and real money are different money. Polled, read again whenever a write or the faucet says
 * a balance moved, and by `refetch` after a read failed.
 */
export function useWalletBalances(walletAddress: `0x${string}` | undefined) {
  const config = useConfig();

  const usdtContracts = useMemo(
    () =>
      walletAddress
        ? AVAILABLE_CHAINS.map((chain) => ({
            address: chain.usdt,
            abi: balanceOfAbi,
            functionName: 'balanceOf' as const,
            args: [walletAddress] as const,
            chainId: chain.id,
          }))
        : [],
    [walletAddress]
  );
  const usdt = useReadContracts({
    contracts: usdtContracts,
    query: { enabled: usdtContracts.length > 0, refetchInterval: BALANCE_POLL_INTERVAL, staleTime: 0 },
  });

  const eth = useQueries({
    queries: AVAILABLE_CHAINS.map((chain) => ({
      ...getBalanceQueryOptions(config, { address: walletAddress, chainId: chain.id }),
      enabled: !!walletAddress,
      refetchInterval: BALANCE_POLL_INTERVAL,
      staleTime: 0,
    })),
  });

  const refetch = () => {
    void usdt.refetch();
    eth.forEach((query) => void query.refetch());
  };
  // useQueries hands back a new array every render; the subscription reads the latest one.
  const onBalanceMoved = useEffectEvent(refetch);

  useEffect(() => subscribeToBalanceRefresh(onBalanceMoved), []);

  const usdtByNetwork = usdtReadings(AVAILABLE_CHAINS.length, usdt.data, usdt.isError);
  const networks: NetworkBalances[] = AVAILABLE_CHAINS.map((chain, index) => ({
    chain,
    usdt: usdtByNetwork[index],
    eth: ethReading(eth[index]),
  }));

  return { networks, refetch };
}
