'use client';

import type { SocialLinks } from '@/lib/profile';
import { SocialLinkPill } from './SocialLinkPill';

interface SocialLinksDisplayProps {
  socialLinks: SocialLinks | null | undefined;
}

/**
 * Read-only pill row for the public profile page. Renders at most
 * three pills (Steam, Telegram, Instagram) in the order they appear in
 * the data model, and returns {@code null} when no link is present so
 * callers can drop the surrounding container cleanly.
 */
export function SocialLinksDisplay({ socialLinks }: SocialLinksDisplayProps) {
  if (!socialLinks) return null;
  const { steam, telegram, instagram } = socialLinks;
  if (!steam && !telegram && !instagram) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {steam && (
        <SocialLinkPill
          platform="steam"
          label={steam.username ?? steam.steamId}
          href={`https://steamcommunity.com/profiles/${encodeURIComponent(steam.steamId)}`}
          verified
        />
      )}
      {telegram && (
        <SocialLinkPill
          platform="telegram"
          label={telegram.username ? `@${telegram.username}` : telegram.displayName}
          href={telegram.username ? `https://t.me/${encodeURIComponent(telegram.username)}` : undefined}
          verified
        />
      )}
      {instagram && (
        <SocialLinkPill
          platform="instagram"
          label={`@${instagram.handle}`}
          href={`https://www.instagram.com/${encodeURIComponent(instagram.handle)}/`}
          selfReported
        />
      )}
    </div>
  );
}
