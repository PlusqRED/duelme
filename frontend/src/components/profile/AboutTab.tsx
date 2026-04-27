'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { PROFILE_LIMITS } from '@/lib/profile';
import { InlineEditField } from './InlineEditField';
import { InlineGamesEditor } from './InlineGamesEditor';
import type { Profile, ProfileRequest } from '@/lib/profile';

interface AboutTabProps {
  profile: Profile | null;
  isOwner: boolean;
  onUpdate?: (data: ProfileRequest) => Promise<void>;
  isSaving?: boolean;
}

export function AboutTab({ profile, isOwner, onUpdate, isSaving }: AboutTabProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US';

  const hasAnything =
    !!profile?.aboutMe ||
    !!profile?.pronouns ||
    !!profile?.region ||
    (profile?.games?.length ?? 0) > 0;

  if (!isOwner && !hasAnything) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm italic text-slate-400">
        {t('profile.empty.about')}
      </p>
    );
  }

  if (isOwner && onUpdate) {
    const wrap = (key: keyof ProfileRequest) => async (next: string | null) => {
      await onUpdate({ [key]: next });
    };

    return (
      <div className="flex flex-col gap-4">
        <InlineEditField
          label={t('profile.aboutMe')}
          placeholder={t('profile.aboutMePlaceholder')}
          value={profile?.aboutMe ?? null}
          maxLength={PROFILE_LIMITS.aboutMe}
          multiline
          onSave={wrap('aboutMe')}
          isSaving={isSaving}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InlineEditField
            label={t('profile.pronouns')}
            placeholder={t('profile.pronounsPlaceholder')}
            value={profile?.pronouns ?? null}
            maxLength={PROFILE_LIMITS.pronouns}
            onSave={wrap('pronouns')}
            isSaving={isSaving}
          />
          <InlineEditField
            label={t('profile.region')}
            placeholder={t('profile.regionPlaceholder')}
            value={profile?.region ?? null}
            maxLength={PROFILE_LIMITS.region}
            onSave={wrap('region')}
            isSaving={isSaving}
          />
        </div>
        <InlineGamesEditor
          games={profile?.games ?? []}
          onSave={async (games) => onUpdate({ games })}
          isSaving={isSaving}
        />
        {profile?.createdAt && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {t('profile.tookUpArms')}
            </div>
            <p className="text-sm text-slate-900">
              {new Date(profile.createdAt).toLocaleDateString(dateLocale, { dateStyle: 'medium' })}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Public view (not owner)
  return (
    <div className="flex flex-col gap-4">
      {profile?.aboutMe && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            {t('profile.aboutMe')}
          </div>
          <p className="text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
            {profile.aboutMe}
          </p>
        </div>
      )}
      {(profile?.pronouns || profile?.region) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {profile?.pronouns && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('profile.pronouns')}
              </div>
              <p className="text-sm text-slate-900">{profile.pronouns}</p>
            </div>
          )}
          {profile?.region && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('profile.region')}
              </div>
              <p className="text-sm text-slate-900">{profile.region}</p>
            </div>
          )}
        </div>
      )}
      {profile?.games && profile.games.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            {t('profile.games')}
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.games.map((g) => (
              <span
                key={g}
                className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
      {profile?.createdAt && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            {t('profile.tookUpArms')}
          </div>
          <p className="text-sm text-slate-900">
            {new Date(profile.createdAt).toLocaleDateString(dateLocale, { dateStyle: 'medium' })}
          </p>
        </div>
      )}
    </div>
  );
}
