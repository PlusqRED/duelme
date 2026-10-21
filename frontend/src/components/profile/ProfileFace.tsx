'use client';

import { useState } from 'react';
import { Avatar } from '@/components/identity/Avatar';
import { useTranslation } from '@/i18n/useTranslation';
import { getProfileAvatarUrls, isUsableAvatarImageSize, type Profile } from '@/lib/profile';
import { cn } from '@/lib/utils';

interface ProfileFaceProps {
  profile: Pick<Profile, 'socialLinks'> | null;
  displayName: string;
  address: string;
  className?: string;
}

/**
 * A player's face on their profile: the photo of an account they linked, Steam's before
 * Telegram's, else their identicon on an ink token. A photo that fails to load, or loads as a
 * tracking pixel, gives way to the next one.
 */
export function ProfileFace({ profile, displayName, address, className }: ProfileFaceProps) {
  const { t } = useTranslation();
  const label = t('profile.avatarAlt', { name: displayName });
  const urls = getProfileAvatarUrls(profile);
  const urlsKey = urls.join('\n');
  // Kept with the photos they were for, so linking a new account starts the list afresh.
  const [failed, setFailed] = useState<{ key: string; urls: readonly string[] }>({ key: '', urls: [] });
  const failedUrls = failed.key === urlsKey ? failed.urls : [];
  const url = urls.find((candidate) => !failedUrls.includes(candidate));

  function reject(bad: string) {
    setFailed((previous) => {
      const known = previous.key === urlsKey ? previous.urls : [];
      return known.includes(bad) ? previous : { key: urlsKey, urls: [...known, bad] };
    });
  }

  return (
    <span className={cn('block size-24 shrink-0 overflow-hidden rounded-full', className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- social avatar URLs come from Steam/Telegram and are not a fixed Next image allowlist.
        <img
          key={url}
          src={url}
          alt={label}
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onLoad={(event) => {
            const image = event.currentTarget;
            if (!isUsableAvatarImageSize(image.naturalWidth, image.naturalHeight)) reject(url);
          }}
          onError={() => reject(url)}
        />
      ) : (
        <span role="img" aria-label={label} className="block size-full">
          <Avatar address={address} tone="ink" className="size-full" />
        </span>
      )}
    </span>
  );
}
