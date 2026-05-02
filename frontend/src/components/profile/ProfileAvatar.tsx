'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { getProfileAvatarUrls, type Profile } from '@/lib/profile';
import { cn } from '@/lib/utils';

interface ProfileAvatarProps {
  profile: Pick<Profile, 'socialLinks'> | null | undefined;
  displayName: string;
  className?: string;
}

export function ProfileAvatar({ profile, displayName, className }: ProfileAvatarProps) {
  const { t } = useTranslation();
  const avatarUrls = getProfileAvatarUrls(profile);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const avatarUrl = avatarUrls.find((url) => !failedUrls.includes(url));

  return (
    <div
      className={cn(
        'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/10',
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- social avatar URLs come from Steam/Telegram and are not a fixed Next image allowlist.
        <img
          src={avatarUrl}
          alt={t('profile.avatarAlt', { name: displayName })}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => {
            setFailedUrls((prev) => prev.includes(avatarUrl) ? prev : [...prev, avatarUrl]);
          }}
        />
      ) : (
        <User aria-hidden="true" className="h-8 w-8 text-white/80" />
      )}
    </div>
  );
}
