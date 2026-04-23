'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useIdentityToken } from '@privy-io/react-auth';
import {
  setInstagramHandle,
  startSteamLink,
  startTelegramLink,
  unlinkSocial,
} from '@/lib/profileApi';
import type { SocialPlatform } from '@/lib/profile';

/**
 * Focused hook for social-account linking. Kept separate from
 * `useMyProfile` so social mutations stay independently testable and
 * the profile hook doesn't balloon as platforms are added.
 *
 * The `startSteam` and `startTelegram` mutations just obtain a redirect
 * URL from the backend — the caller is responsible for navigating the
 * browser to it. `setInstagram` and `unlink` return the updated profile
 * via the React Query cache invalidation below.
 */
export function useSocialLinks() {
  const { identityToken } = useIdentityToken();
  const queryClient = useQueryClient();

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: ['profile'] });

  const startSteam = useMutation({
    mutationFn: () => {
      if (!identityToken) throw new Error('Not authenticated');
      return startSteamLink(identityToken);
    },
  });

  const startTelegram = useMutation({
    mutationFn: () => {
      if (!identityToken) throw new Error('Not authenticated');
      return startTelegramLink(identityToken);
    },
  });

  const setInstagram = useMutation({
    mutationFn: (handle: string) => {
      if (!identityToken) throw new Error('Not authenticated');
      return setInstagramHandle(identityToken, handle);
    },
    onSuccess: () => {
      void invalidateProfile();
    },
  });

  const unlink = useMutation({
    mutationFn: (platform: SocialPlatform) => {
      if (!identityToken) throw new Error('Not authenticated');
      return unlinkSocial(identityToken, platform);
    },
    onSuccess: () => {
      void invalidateProfile();
    },
  });

  return { startSteam, startTelegram, setInstagram, unlink };
}
