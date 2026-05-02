'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import type { SocialLinks, SocialPlatform } from '@/lib/profile';
import { InstagramHandleDialog } from './InstagramHandleDialog';
import { SocialLinkCard } from './SocialLinkCard';
import { UnlinkConfirmDialog } from './UnlinkConfirmDialog';

interface SocialLinksSectionProps {
  socialLinks: SocialLinks | null | undefined;
}

export function SocialLinksSection({ socialLinks }: SocialLinksSectionProps) {
  const { t } = useTranslation();
  const [instagramOpen, setInstagramOpen] = useState(false);
  const [instagramOpenCount, setInstagramOpenCount] = useState(0);
  const [unlinkPlatform, setUnlinkPlatform] = useState<SocialPlatform | null>(null);

  const steam = socialLinks?.steam ?? null;
  const telegram = socialLinks?.telegram ?? null;
  const instagram = socialLinks?.instagram ?? null;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{t('profile.socialLinks.title')}</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('profile.socialLinks.subtitle')}</p>
      </div>

      <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <SocialLinkCard
          platform="steam"
          state={steam ? 'linked' : 'notLinked'}
          primaryLabel={steam?.username ?? steam?.steamId}
          externalUrl={steam ? `https://steamcommunity.com/profiles/${encodeURIComponent(steam.steamId)}` : undefined}
          onUnlink={() => setUnlinkPlatform('steam')}
        />
        <SocialLinkCard
          platform="telegram"
          state={telegram ? 'linked' : 'notLinked'}
          primaryLabel={telegram ? (telegram.username ? `@${telegram.username}` : telegram.displayName) : undefined}
          externalUrl={telegram?.username ? `https://t.me/${encodeURIComponent(telegram.username)}` : undefined}
          onUnlink={() => setUnlinkPlatform('telegram')}
        />
        <SocialLinkCard
          platform="instagram"
          state={instagram ? 'selfReported' : 'notLinked'}
          primaryLabel={instagram ? `@${instagram.handle}` : undefined}
          externalUrl={instagram ? `https://www.instagram.com/${encodeURIComponent(instagram.handle)}/` : undefined}
          onAddInstagram={() => {
            setInstagramOpenCount((c) => c + 1);
            setInstagramOpen(true);
          }}
          onEditInstagram={() => {
            setInstagramOpenCount((c) => c + 1);
            setInstagramOpen(true);
          }}
          onUnlink={() => setUnlinkPlatform('instagram')}
        />
      </div>

      <InstagramHandleDialog
        key={instagramOpenCount}
        open={instagramOpen}
        initialHandle={instagram?.handle}
        onOpenChange={setInstagramOpen}
      />
      <UnlinkConfirmDialog
        open={unlinkPlatform !== null}
        platform={unlinkPlatform}
        onOpenChange={(open) => {
          if (!open) setUnlinkPlatform(null);
        }}
      />
    </section>
  );
}
