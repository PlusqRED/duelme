'use client';

import { Share2 } from 'lucide-react';
import { useAppToast } from '@/hooks/useAppToast';
import { useTranslation } from '@/i18n/useTranslation';

interface ShareProfileButtonProps {
  walletAddress: string;
}

export function ShareProfileButton({ walletAddress }: ShareProfileButtonProps) {
  const appToast = useAppToast();
  const { t } = useTranslation();

  async function copy() {
    try {
      const url = `${window.location.origin}/profile/${walletAddress}`;
      await navigator.clipboard.writeText(url);
      appToast.success('toast.profileLinkCopied');
    } catch {
      // ignore — clipboard rejected
    }
  }

  return (
    <button
      onClick={copy}
      aria-label={t('profile.cta.share')}
      className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white/90 transition-colors hover:bg-white/20 min-h-[44px] min-w-[44px] justify-center"
    >
      <Share2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t('profile.cta.share')}</span>
    </button>
  );
}
