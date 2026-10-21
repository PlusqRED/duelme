'use client';

import { useState } from 'react';
import { PLATFORM_NAME_KEY, PlatformIcon } from '@/components/profile/PlatformIcon';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAppToast } from '@/hooks/useAppToast';
import { useSocialLinks } from '@/hooks/useSocialLinks';
import { useTranslation } from '@/i18n/useTranslation';
import type { SocialLinkError } from '@/lib/profileApi';

interface ConnectOAuthButtonProps {
  platform: 'steam' | 'telegram';
}

/**
 * Kicks off the OAuth link flow for Steam or Telegram. On success we
 * navigate the browser directly to the returned redirect URL — a
 * full-page transition is more reliable than a popup on mobile
 * browsers (particularly iOS Safari, which blocks popups aggressively).
 */
export function ConnectOAuthButton({ platform }: ConnectOAuthButtonProps) {
  const { t } = useTranslation();
  const toast = useAppToast();
  const { startSteam, startTelegram } = useSocialLinks();
  const mutation = platform === 'steam' ? startSteam : startTelegram;
  const [redirecting, setRedirecting] = useState(false);
  const name = t(PLATFORM_NAME_KEY[platform]);

  async function handleClick() {
    try {
      const { redirectUrl } = await mutation.mutateAsync();
      setRedirecting(true);
      window.location.assign(redirectUrl);
    } catch (error) {
      const code = (error as SocialLinkError | undefined)?.code ?? 'network';
      toast.error(code === 'unauthorized' ? 'toast.socialLinks.network' : 'toast.socialLinks.verificationFailed', {
        platform: name,
      });
    }
  }

  const busy = mutation.isPending || redirecting;

  return (
    <Button type="button" variant="paper" size="sm" onClick={handleClick} disabled={busy} aria-busy={busy}>
      {busy ? <Spinner /> : <PlatformIcon platform={platform} className="size-[18px]" />}
      {busy ? t('profile.socialLinks.connecting') : t('profile.socialLinks.connect', { platform: name })}
    </Button>
  );
}
