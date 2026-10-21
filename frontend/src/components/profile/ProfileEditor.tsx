'use client';

import { useId, useState } from 'react';
import { ProfileField } from '@/components/profile/ProfileField';
import { ProfileGamesField } from '@/components/profile/ProfileGamesField';
import { useAppToast } from '@/hooks/useAppToast';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { PROFILE_LIMITS, type Profile, type ProfileRequest } from '@/lib/profile';
import { profileRequestWith, type ProfileTextField } from '@/lib/profileEdit';

const TEXT_FIELDS: readonly { field: ProfileTextField; label: TranslationKey; placeholder: TranslationKey; isMultiline?: boolean }[] = [
  { field: 'nickname', label: 'profile.nickname', placeholder: 'profile.nicknamePlaceholder' },
  { field: 'status', label: 'profile.status', placeholder: 'profile.statusPlaceholder' },
  { field: 'aboutMe', label: 'profile.aboutMe', placeholder: 'profile.aboutMePlaceholder', isMultiline: true },
];

interface ProfileEditorProps {
  profile: Profile | null;
  isSaving: boolean;
  updateProfile: (request: ProfileRequest) => Promise<Profile>;
}

/**
 * What other players see beside the owner's address, each part edited where it stands: one at a
 * time, so a half-typed change is never saved by accident with another.
 */
export function ProfileEditor({ profile, isSaving, updateProfile }: ProfileEditorProps) {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const titleId = useId();
  const [editing, setEditing] = useState<ProfileTextField | 'games' | null>(null);

  async function save(change: ProfileRequest) {
    try {
      await updateProfile(profileRequestWith(profile, change));
      appToast.success('toast.profileSaved');
      setEditing(null);
    } catch {
      appToast.error('toast.profileSaveFailed');
    }
  }

  return (
    <section aria-labelledby={titleId} className="grid content-start rounded-[28px] border border-line bg-paper p-[clamp(18px,3vw,28px)]">
      <div className="mb-2 grid gap-1">
        <h2 id={titleId} className="text-xl">
          {t('profile.yourProfile')}
        </h2>
        <p className="text-body-sm text-ink-2">{t('profile.yourProfileHint')}</p>
      </div>
      {TEXT_FIELDS.map(({ field, label, placeholder, isMultiline }) => (
        <ProfileField
          key={field}
          label={t(label)}
          placeholder={t(placeholder)}
          value={profile?.[field] ?? null}
          limit={PROFILE_LIMITS[field]}
          isMultiline={isMultiline}
          isEditing={editing === field}
          isSaving={isSaving}
          onEdit={() => setEditing(field)}
          onCancel={() => setEditing(null)}
          onSave={(value) => save({ [field]: value })}
        />
      ))}
      <ProfileGamesField
        games={profile?.games ?? []}
        isEditing={editing === 'games'}
        isSaving={isSaving}
        onEdit={() => setEditing('games')}
        onCancel={() => setEditing(null)}
        onSave={(games) => save({ games })}
      />
    </section>
  );
}
