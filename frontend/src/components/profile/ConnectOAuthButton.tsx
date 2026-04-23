'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppToast } from '@/hooks/useAppToast';
import { useSocialLinks } from '@/hooks/useSocialLinks';
import { useTranslation } from '@/i18n/useTranslation';
import type { SocialLinkError } from '@/lib/profileApi';
import { SteamIcon } from './icons/SteamIcon';
import { TelegramIcon } from './icons/TelegramIcon';

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

  async function handleClick() {
    try {
      const { redirectUrl } = await mutation.mutateAsync();
      setRedirecting(true);
      window.location.assign(redirectUrl);
    } catch (error) {
      const code = (error as SocialLinkError | undefined)?.code ?? 'network';
      toast.error(
        code === 'unauthorized' ? 'toast.socialLinks.network' : 'toast.socialLinks.verificationFailed',
        { platform: t(platformKey(platform)) },
      );
    }
  }

  const busy = mutation.isPending || redirecting;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      className="h-11 w-full justify-center gap-2"
    >
      {busy ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        <PlatformIcon platform={platform} />
      )}
      {busy
        ? t('profile.socialLinks.connecting')
        : t('profile.socialLinks.connect', { platform: t(platformKey(platform)) })}
    </Button>
  );
}

function PlatformIcon({ platform }: { platform: 'steam' | 'telegram' }) {
  const className = 'h-4 w-4';
  return platform === 'steam' ? (
    <SteamIcon className={className} />
  ) : (
    <TelegramIcon className={className} />
  );
}

function platformKey(platform: 'steam' | 'telegram'): 'profile.socialLinks.steam' | 'profile.socialLinks.telegram' {
  return platform === 'steam' ? 'profile.socialLinks.steam' : 'profile.socialLinks.telegram';
}
