'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '@/hooks/useAppToast';
import { localePath } from '@/i18n/localePath';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { takeOAuthReturn } from '@/lib/oauthReturn';

/**
 * Inspects the URL query string for {@code ?steam=...} or
 * {@code ?telegram=...} set by the backend redirect after an OAuth
 * link completes. Shows the matching toast, clears the query string,
 * and invalidates the profile cache so the new link appears. The backend always returns to the
 * English address, so a player who left from another language is first taken back to it.
 */
export function OAuthCallbackHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  // Set once the page is on its way to the player's language: a second run of the effect (Strict
  // Mode runs it twice) finds the kept language gone and must not toast or move in this one.
  const isLeaving = useRef(false);

  useEffect(() => {
    if (isLeaving.current) return;
    const steam = params.get('steam');
    const telegram = params.get('telegram');
    const platformStatus = steam ? { key: 'steam', status: steam } : telegram ? { key: 'telegram', status: telegram } : null;
    if (!platformStatus) return;
    const returnTo = takeOAuthReturn();
    if (returnTo !== null && returnTo !== language) {
      isLeaving.current = true;
      window.location.replace(localePath(`/profile${window.location.search}`, returnTo));
      return;
    }

    const platformLabel = t(
      platformStatus.key === 'steam'
        ? 'profile.socialLinks.steam'
        : 'profile.socialLinks.telegram',
    );
    const toastParams: TranslationParams = { platform: platformLabel };
    const info: { level: 'success' | 'error'; key: TranslationKey } = mapStatusToToast(
      platformStatus.status,
    );
    if (info.level === 'success') {
      toast.success(info.key, toastParams);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    } else {
      toast.error(info.key, toastParams);
    }

    // Strip the query param so refreshing the page doesn't re-toast.
    router.replace(localePath('/profile', language));
  }, [params, router, toast, queryClient, t, language]);

  return null;
}

function mapStatusToToast(status: string): {
  level: 'success' | 'error';
  key: TranslationKey;
} {
  switch (status) {
    case 'success':
      return { level: 'success', key: 'toast.socialLinks.linked' };
    case 'alreadyLinked':
      return { level: 'error', key: 'toast.socialLinks.alreadyLinked' };
    case 'unavailable':
      return { level: 'error', key: 'toast.socialLinks.network' };
    case 'cancelled':
      return { level: 'error', key: 'toast.socialLinks.cancelled' };
    case 'verificationFailed':
    default:
      return { level: 'error', key: 'toast.socialLinks.verificationFailed' };
  }
}
