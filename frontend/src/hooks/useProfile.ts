'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchProfileByAddress } from '@/lib/profileApi';
import type { Profile } from '@/lib/profile';

export function useProfile(walletAddress: string | undefined) {
  const normalized = walletAddress?.toLowerCase();

  const { data: profile, isLoading } = useQuery<Profile | null>({
    queryKey: ['profile', normalized],
    queryFn: () => fetchProfileByAddress(normalized!),
    enabled: !!normalized,
    staleTime: 60_000,
  });

  return {
    profile: profile ?? null,
    isLoading,
  };
}
