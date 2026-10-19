'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { Identicon } from '@/components/identity/Identicon';
import { getProfileAvatarUrls, isUsableAvatarImageSize, type Profile } from '@/lib/profile';
import { cn } from '@/lib/utils';

interface ProfileAvatarProps {
  profile: Pick<Profile, 'socialLinks'> | null | undefined;
  displayName: string;
  walletAddress?: string | null;
  className?: string;
}

export function ProfileAvatar({ profile, displayName, walletAddress, className }: ProfileAvatarProps) {
  const { t } = useTranslation();
  const avatarLabel = t('profile.avatarAlt', { name: displayName });
  const avatarUrls = getProfileAvatarUrls(profile);
  const avatarKey = avatarUrls.join('\n');
  const [failedState, setFailedState] = useState<{ key: string; urls: string[] }>({
    key: '',
    urls: [],
  });
  const failedUrls = failedState.key === avatarKey ? failedState.urls : [];
  const avatarUrl = avatarUrls.find((url) => !failedUrls.includes(url));

  function rejectAvatarUrl(url: string) {
    setFailedState((prev) => {
      const urls = prev.key === avatarKey ? prev.urls : [];
      if (prev.key === avatarKey && urls.includes(url)) return prev;
      return {
        key: avatarKey,
        urls: urls.includes(url) ? urls : [...urls, url],
      };
    });
  }

  return (
    <div
      className={cn(
        'flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/30 bg-white/10 shadow-lg sm:h-32 sm:w-32',
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- social avatar URLs come from Steam/Telegram and are not a fixed Next image allowlist.
        <img
          key={avatarUrl}
          src={avatarUrl}
          alt={avatarLabel}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onLoad={(event) => {
            const image = event.currentTarget;
            if (!isUsableAvatarImageSize(image.naturalWidth, image.naturalHeight)) {
              rejectAvatarUrl(avatarUrl);
            }
          }}
          onError={() => rejectAvatarUrl(avatarUrl)}
        />
      ) : walletAddress?.trim() ? (
        <span role="img" aria-label={avatarLabel} className="grid size-full place-items-center bg-ink text-paper">
          <Identicon address={walletAddress} className="size-[52%]" />
        </span>
      ) : (
        <User
          role="img"
          aria-label={avatarLabel}
          className="h-10 w-10 text-white/80 sm:h-14 sm:w-14"
        />
      )}
    </div>
  );
}
