'use client';

import { useReadContract } from 'wagmi';
import { duelMeAbi, type Duel } from '@/lib/contracts';
import { DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';

interface UseDuelResult {
  duel: Duel | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

export function useDuel(duelId: bigint, chainId: number): UseDuelResult {
  const contractAddress = DUELME_ADDRESSES[chainId];

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'getDuel',
    args: [duelId],
    chainId,
    query: {
      enabled: !!contractAddress && contractAddress !== ZERO_ADDRESS,
    },
  });

  // The decoded struct is already the shape `Duel` describes — spelling the fields out again is
  // how `invitedOpponent` went missing here once. Handed through rather than spread: wagmi's
  // `data` is referentially stable between refetches, and a fresh object each render would
  // re-fire every `[duel]` effect on the duel page, including one that writes to localStorage.
  //
  // Annotated, never asserted. `data as Duel` would keep compiling after the ABI stopped decoding
  // a field `Duel` declares — `Duel` is assignable to the narrower decoded type, so the assertion
  // stays legal and `duel.invitedOpponent` is `undefined` at runtime. An annotation is checked the
  // strict way round, so that drift fails here instead of as a TypeError on the duel page.
  const duel: Duel | undefined = data;

  return { duel, isLoading, isError, refetch };
}
