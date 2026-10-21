'use client';

import { useId } from 'react';
import { GameChip } from '@/components/profile/GameChip';
import { SocialAccounts } from '@/components/profile/SocialAccounts';
import { useTranslation } from '@/i18n/useTranslation';
import type { Profile } from '@/lib/profile';
import { formatDate } from '@/lib/utils';

/**
 * What a player wrote about themselves, the games they play and the accounts they linked, read by
 * anyone; a player who never set up a profile gets an empty, dashed card that says so.
 */
export function ProfileAbout({ profile }: { profile: Profile | null }) {
  const { t, language } = useTranslation();
  const titleId = useId();

  if (!profile) {
    return (
      <p className="rounded-[28px] border-2 border-dashed border-line-strong p-[clamp(18px,3vw,28px)] text-ink-2">
        {t('profile.noProfileYet')}
      </p>
    );
  }
  const games = profile.games ?? [];

  return (
    <section aria-labelledby={titleId} className="grid content-start gap-5 rounded-[28px] border border-line bg-paper p-[clamp(18px,3vw,28px)]">
      <h2 id={titleId} className="text-xl">
        {t('profile.aboutMe')}
      </h2>
      {profile.aboutMe && <p className="-mt-2 whitespace-pre-line [overflow-wrap:anywhere]">{profile.aboutMe}</p>}
      {games.length > 0 && (
        <div className="grid gap-2.5">
          <h3 className="text-lg">{t('profile.games')}</h3>
          <ul className="flex flex-wrap gap-2">
            {games.map((game) => (
              <GameChip key={game} game={game} />
            ))}
          </ul>
        </div>
      )}
      <SocialAccounts links={profile.socialLinks} />
      {profile.createdAt && (
        <p className="border-t border-dashed border-line-strong pt-4 text-note text-ink-3">
          {t('profile.memberSince')} {formatDate(profile.createdAt, language)}
        </p>
      )}
    </section>
  );
}
