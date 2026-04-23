'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import type { SocialPlatform } from '@/lib/profile';
import { ConnectOAuthButton } from './ConnectOAuthButton';
import { InstagramIcon } from './icons/InstagramIcon';
import { SteamIcon } from './icons/SteamIcon';
import { TelegramIcon } from './icons/TelegramIcon';

interface SocialLinkCardProps {
  platform: SocialPlatform;
  state: 'notLinked' | 'linked' | 'selfReported';
  primaryLabel?: string;
  externalUrl?: string;
  onAddInstagram?: () => void;
  onEditInstagram?: () => void;
  onUnlink: () => void;
}

const PLATFORM_LABEL_KEY: Record<SocialPlatform, 'profile.socialLinks.steam' | 'profile.socialLinks.telegram' | 'profile.socialLinks.instagram'> = {
  steam: 'profile.socialLinks.steam',
  telegram: 'profile.socialLinks.telegram',
  instagram: 'profile.socialLinks.instagram',
};

function PlatformIcon({ platform }: { platform: SocialPlatform }) {
  const className = 'h-5 w-5';
  switch (platform) {
    case 'steam':
      return <SteamIcon className={className} />;
    case 'telegram':
      return <TelegramIcon className={className} />;
    case 'instagram':
      return <InstagramIcon className={className} />;
  }
}

export function SocialLinkCard({
  platform,
  state,
  primaryLabel,
  externalUrl,
  onAddInstagram,
  onEditInstagram,
  onUnlink,
}: SocialLinkCardProps) {
  const { t } = useTranslation();
  const platformName = t(PLATFORM_LABEL_KEY[platform]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <PlatformIcon platform={platform} />
        <span>{platformName}</span>
        {state === 'linked' && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            {t('profile.socialLinks.verified')}
          </span>
        )}
        {state === 'selfReported' && (
          <span className="ml-auto inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 italic">
            {t('profile.socialLinks.selfReported')}
          </span>
        )}
      </div>

      {state === 'notLinked' ? (
        platform === 'instagram' ? (
          <Button
            type="button"
            variant="outline"
            onClick={onAddInstagram}
            className="h-11 w-full justify-center"
          >
            {t('profile.socialLinks.add', { platform: platformName })}
          </Button>
        ) : (
          <ConnectOAuthButton platform={platform} />
        )
      ) : (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {externalUrl ? (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-medium text-indigo-600 hover:underline"
              >
                {primaryLabel}
              </a>
            ) : (
              <p className="truncate text-sm font-medium text-slate-900">{primaryLabel}</p>
            )}
          </div>
          {platform === 'instagram' && onEditInstagram && (
            <Button
              type="button"
              variant="outline"
              onClick={onEditInstagram}
              className="h-11 shrink-0"
            >
              {t('profile.socialLinks.edit')}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={onUnlink}
            aria-label={t('profile.socialLinks.unlinkTitle', { platform: platformName })}
            className="h-11 w-11 shrink-0"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
