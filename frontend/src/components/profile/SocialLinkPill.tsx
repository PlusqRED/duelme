'use client';

import { ShieldCheck } from 'lucide-react';
import type { SocialPlatform } from '@/lib/profile';
import { useTranslation } from '@/i18n/useTranslation';
import { SteamIcon } from './icons/SteamIcon';
import { TelegramIcon } from './icons/TelegramIcon';
import { InstagramIcon } from './icons/InstagramIcon';

interface SocialLinkPillProps {
  platform: SocialPlatform;
  label: string;
  href?: string;
  verified?: boolean;
  selfReported?: boolean;
}

const PLATFORM_THEME: Record<SocialPlatform, { bg: string; border: string; text: string; icon: string }> = {
  steam: {
    bg: 'bg-slate-900',
    border: 'border-slate-800',
    text: 'text-white',
    icon: 'text-white',
  },
  telegram: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-900',
    icon: 'text-sky-600',
  },
  instagram: {
    bg: 'bg-fuchsia-50',
    border: 'border-fuchsia-200',
    text: 'text-fuchsia-900',
    icon: 'text-fuchsia-600',
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

/**
 * Read-only inline pill used on public profiles and in the linked state
 * of a {@link SocialLinkCard}. External links open in a new tab with
 * noopener/noreferrer. Verified links show a shield icon; self-reported
 * ones get a muted "self-reported" sub-label.
 */
export function SocialLinkPill({ platform, label, href, verified, selfReported }: SocialLinkPillProps) {
  const { t } = useTranslation();
  const theme = PLATFORM_THEME[platform];

  const content = (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${theme.bg} ${theme.border} ${theme.text}`}
    >
      <PlatformIcon platform={platform} className={`h-3.5 w-3.5 shrink-0 ${theme.icon}`} />
      <span className="truncate">{label}</span>
      {verified && <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-80" />}
      {selfReported && (
        <span className="shrink-0 text-[10px] italic opacity-70">
          {t('profile.socialLinks.selfReported')}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${platform} — ${label}`}
        className="inline-flex max-w-full hover:opacity-80"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </a>
    );
  }

  return content;
}
