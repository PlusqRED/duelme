'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { fetchMyProfile, upsertMyProfile } from '@/lib/profileApi';
import type { Profile, ProfileRequest } from '@/lib/profile';
import { useActiveWallet } from './useActiveWallet';

export function useMyProfile() {
  const { authenticated } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { walletAddress } = useActiveWallet();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<Profile | null>({
    queryKey: ['profile', 'me', walletAddress],
    queryFn: async () => {
      if (!identityToken) throw new Error('No identity token');
      return fetchMyProfile(identityToken);
    },
    enabled: authenticated && !!identityToken && !!walletAddress,
    staleTime: 60_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: async (data: ProfileRequest) => {
      if (!identityToken) throw new Error('Not authenticated');
      return upsertMyProfile(identityToken, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return {
    profile: profile ?? null,
    isLoading,
    updateProfile: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
