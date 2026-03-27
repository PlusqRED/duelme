'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { fetchMyProfile, upsertMyProfile } from '@/lib/profileApi';
import type { Profile, ProfileRequest } from '@/lib/profile';

export function useMyProfile() {
  const { authenticated, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<Profile | null>({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token');
      return fetchMyProfile(token);
    },
    enabled: authenticated,
    staleTime: 60_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: async (data: ProfileRequest) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return upsertMyProfile(token, data);
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
