'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProfilesByAddresses } from '@/lib/profileApi';
import { truncateAddress } from '@/lib/utils';
import { ZERO_ADDRESS } from '@/lib/constants';

export function useNicknames(addresses: Array<string | undefined>) {
  const normalizedAddresses = useMemo(
    () => Array.from(
      new Set(
        addresses
          .filter((a): a is string => Boolean(a) && a !== ZERO_ADDRESS)
          .map((a) => a.toLowerCase())
      )
    ),
    [addresses]
  );

  const { data } = useQuery({
    queryKey: ['profile', 'nicknames', normalizedAddresses],
    queryFn: () => fetchProfilesByAddresses(normalizedAddresses),
    enabled: normalizedAddresses.length > 0,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const nicknameByAddress = useMemo<Record<string, string | null>>(() => {
    const result: Record<string, string | null> = {};
    if (!data) return result;
    for (const profile of data) {
      result[profile.walletAddress.toLowerCase()] = profile.nickname || null;
    }
    return result;
  }, [data]);

  const resolveDisplay = useCallback(
    (address: string) => {
      const nickname = nicknameByAddress[address.toLowerCase()];
      return nickname || truncateAddress(address);
    },
    [nicknameByAddress]
  );

  return { nicknameByAddress, resolveDisplay };
}
