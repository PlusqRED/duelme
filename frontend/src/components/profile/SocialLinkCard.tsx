'use client';

import { CircleDashed, ExternalLink, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import type { SocialPlatform } from '@/lib/profile';
import { cn } from '@/lib/utils';
import { ConnectOAuthButton } from './ConnectOAuthButton';
import { InstagramIcon } from './icons/InstagramIcon';
import { SteamIcon } from './icons/SteamIcon';
import { TelegramIcon } from './icons/TelegramIcon';

type SocialLinkState = 'notLinked' | 'linked' | 'selfReported';

interface SocialLinkCardProps {
  platform: SocialPlatform;
  state: SocialLinkState;
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

const PLATFORM_THEME: Record<
  SocialPlatform,
  {
    iconShell: string;
    icon: string;
    linkedBadge: string;
    emptyBadge: string;
  }
> = {
  steam: {
    iconShell: 'bg-slate-950 text-white',
    icon: 'text-white',
    linkedBadge: 'border-slate-800 bg-slate-950 text-white',
    emptyBadge: 'border-slate-200 bg-slate-50 text-slate-600',
  },
  telegram: {
    iconShell: 'bg-sky-500 text-white',
    icon: 'text-white',
    linkedBadge: 'border-sky-200 bg-sky-50 text-sky-900',
    emptyBadge: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  instagram: {
    iconShell: 'bg-rose-500 text-white',
    icon: 'text-white',
    linkedBadge: 'border-rose-200 bg-rose-50 text-rose-900',
    emptyBadge: 'border-rose-200 bg-rose-50 text-rose-700',
  },
};

function PlatformIcon({ platform, className }: { platform: SocialPlatform; className: string }) {
  switch (platform) {
    case 'steam':
      return <SteamIcon className={className} />;
    case 'telegram':
      return <TelegramIcon className={className} />;
    case 'instagram':
      return <InstagramIcon className={className} />;
  }
}

function StatusBadge({ state }: { state: SocialLinkState }) {
  const { t } = useTranslation();

  if (state === 'linked') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <ShieldCheck aria-hidden="true" className="h-3 w-3" />
        {t('profile.socialLinks.verified')}
      </span>
    );
  }

  if (state === 'selfReported') {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
        {t('profile.socialLinks.selfReported')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
      <CircleDashed aria-hidden="true" className="h-3 w-3" />
      {t('profile.socialLinks.notLinked')}
    </span>
  );
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
  const theme = PLATFORM_THEME[platform];
  const linked = state !== 'notLinked';
  const unlinkLabel = t('profile.socialLinks.unlink');
  const accountBadge = (
    <span
      className={cn(
        'inline-flex h-10 max-w-full items-center gap-2 rounded-full border px-3 text-sm font-semibold shadow-sm',
        linked ? theme.linkedBadge : theme.emptyBadge,
      )}
    >
      <PlatformIcon
        platform={platform}
        className={cn('h-4 w-4 shrink-0', platform === 'steam' && linked ? 'text-white' : undefined)}
      />
      <span className="truncate">{primaryLabel ?? t('profile.socialLinks.notLinked')}</span>
      {externalUrl && <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-70" />}
    </span>
  );

  return (
    <div className="flex min-h-[178px] flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm', theme.iconShell)}>
            <PlatformIcon platform={platform} className={cn('h-5 w-5', theme.icon)} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{platformName}</p>
            <div className="mt-1">
              <StatusBadge state={state} />
            </div>
          </div>
        </div>
      </div>

      {state === 'notLinked' ? (
        <div className="mt-auto flex flex-col gap-3">
          {accountBadge}
          {platform === 'instagram' ? (
            <Button
              type="button"
              variant="outline"
              onClick={onAddInstagram}
              className="h-10 w-full justify-center gap-2"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t('profile.socialLinks.add', { platform: platformName })}
            </Button>
          ) : (
            <ConnectOAuthButton platform={platform} />
          )}
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-3">
          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={t('profile.socialLinks.open', { platform: platformName })}
              className="inline-flex max-w-full transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {accountBadge}
            </a>
          ) : (
            accountBadge
          )}
          <div className="flex gap-2">
            {platform === 'instagram' && onEditInstagram && (
              <Button
                type="button"
                variant="outline"
                onClick={onEditInstagram}
                className="h-10 flex-1 justify-center gap-2"
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
                {t('profile.socialLinks.edit')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onUnlink}
              aria-label={t('profile.socialLinks.unlinkTitle', { platform: platformName })}
              className={cn(
                'h-10 justify-center gap-2 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700',
                platform === 'instagram' ? 'flex-1' : 'w-full',
              )}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {unlinkLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
