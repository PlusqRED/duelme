'use client';

import { SocialAccountTile } from '@/components/profile/SocialAccountTile';
import { useTranslation } from '@/i18n/useTranslation';
import type { SocialLinks } from '@/lib/profile';
import { socialAccountsOf } from '@/lib/profileEdit';

/** The accounts a player linked, as a public profile shows them; nothing at all while there are none. */
export function SocialAccounts({ links }: { links: SocialLinks | null }) {
  const { t } = useTranslation();
  const accounts = socialAccountsOf(links);

  if (accounts.length === 0) {
    return null;
  }
  return (
    <div className="grid gap-2.5">
      <h3 className="text-lg">{t('profile.socialLinks.title')}</h3>
      <ul className="grid gap-2.5">
        {accounts.map((account) => (
          <SocialAccountTile key={account.platform} platform={account.platform} account={account} />
        ))}
      </ul>
    </div>
  );
}
