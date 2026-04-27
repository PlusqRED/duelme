'use client';

import { useMemo } from 'react';
import { generateIdenticon } from '@/lib/identicon';
import type { Profile } from '@/lib/profile';

/**
 * Avatar resolution cascade per profile-redesign spec:
 *   Steam avatar → Telegram photo → identicon.
 */
export function useAvatarUrl(walletAddress: string, profile: Profile | null): string {
  return useMemo(() => {
    const steam = profile?.socialLinks?.steam?.avatarUrl;
    if (steam) return steam;

    const telegram = profile?.socialLinks?.telegram?.photoUrl;
    if (telegram) return telegram;

    return generateIdenticon(walletAddress);
  }, [walletAddress, profile?.socialLinks?.steam?.avatarUrl, profile?.socialLinks?.telegram?.photoUrl]);
}
