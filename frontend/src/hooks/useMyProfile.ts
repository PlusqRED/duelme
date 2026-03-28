'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { fetchMyProfile, upsertMyProfile } from '@/lib/profileApi';
import type { Profile, ProfileRequest } from '@/lib/profile';

export function useMyProfile() {
  const { authenticated } = usePrivy();
  const { identityToken } = useIdentityToken();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<Profile | null>({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      if (!identityToken) throw new Error('No identity token');
      return fetchMyProfile(identityToken);
    },
    enabled: authenticated && !!identityToken,
    staleTime: 60_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: async (data: ProfileRequest) => {
      if (!identityToken) throw new Error('Not authenticated');
      return upsertMyProfile(identityToken, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'nicknames'] });
    },
  });

  return {
    profile: profile ?? null,
    isLoading,
    updateProfile: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
