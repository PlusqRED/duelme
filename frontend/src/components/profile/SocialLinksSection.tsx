'use client';

import { useId, useState } from 'react';
import { ConnectOAuthButton } from '@/components/profile/ConnectOAuthButton';
import { InstagramHandleDialog } from '@/components/profile/InstagramHandleDialog';
import { PLATFORM_NAME_KEY } from '@/components/profile/PlatformIcon';
import { SocialAccountTile } from '@/components/profile/SocialAccountTile';
import { UnlinkConfirmDialog } from '@/components/profile/UnlinkConfirmDialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import type { SocialLinks, SocialPlatform } from '@/lib/profile';
import { socialAccountsOf } from '@/lib/profileEdit';

const PLATFORMS: readonly SocialPlatform[] = ['steam', 'telegram', 'instagram'];

/**
 * The owner's linked accounts, a slot for each platform: an empty one offers to connect it, Steam
 * and Telegram by signing in to them and Instagram by typing the handle; a filled one can be
 * unlinked, and an Instagram handle changed.
 */
export function SocialLinksSection({ socialLinks }: { socialLinks: SocialLinks | null }) {
  const { t } = useTranslation();
  const titleId = useId();
  const [isInstagramOpen, setIsInstagramOpen] = useState(false);
  // A new key each time the dialog opens, so it starts from the saved handle rather than a draft.
  const [instagramOpenCount, setInstagramOpenCount] = useState(0);
  const [unlinkPlatform, setUnlinkPlatform] = useState<SocialPlatform | null>(null);
  const accounts = socialAccountsOf(socialLinks);

  function openInstagram() {
    setInstagramOpenCount((count) => count + 1);
    setIsInstagramOpen(true);
  }

  return (
    <section aria-labelledby={titleId} className="grid content-start gap-4 rounded-[28px] border border-line bg-paper p-[clamp(18px,3vw,28px)]">
      <div className="grid gap-1">
        <h2 id={titleId} className="text-xl">
          {t('profile.socialLinks.title')}
        </h2>
        <p className="text-body-sm text-ink-2">{t('profile.socialLinks.subtitle')}</p>
      </div>
      <ul className="grid gap-2.5">
        {PLATFORMS.map((platform) => {
          const account = accounts.find((entry) => entry.platform === platform) ?? null;
          const name = t(PLATFORM_NAME_KEY[platform]);
          return (
            <SocialAccountTile key={platform} platform={platform} account={account}>
              {account === null ? (
                platform === 'instagram' ? (
                  <Button type="button" variant="paper" size="sm" onClick={openInstagram}>
                    <Icon name="plus" className="size-[18px]" />
                    {t('profile.socialLinks.add', { platform: name })}
                  </Button>
                ) : (
                  <ConnectOAuthButton platform={platform} />
                )
              ) : (
                <>
                  {platform === 'instagram' && (
                    <Button type="button" variant="paper" size="sm" onClick={openInstagram}>
                      <Icon name="pen" className="size-4" />
                      {t('profile.socialLinks.edit')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUnlinkPlatform(platform)}
                    aria-label={t('profile.socialLinks.unlinkLabel', { platform: name })}
                  >
                    <Icon name="x" className="size-4" />
                    {t('profile.socialLinks.unlink')}
                  </Button>
                </>
              )}
            </SocialAccountTile>
          );
        })}
      </ul>

      <InstagramHandleDialog
        key={instagramOpenCount}
        open={isInstagramOpen}
        initialHandle={socialLinks?.instagram?.handle}
        onOpenChange={setIsInstagramOpen}
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
