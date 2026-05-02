'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OAuthCallbackHandler } from '@/components/profile/OAuthCallbackHandler';
import { SocialLinksSection } from '@/components/profile/SocialLinksSection';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { BattlesTab } from '@/components/profile/BattlesTab';
import { AboutTab } from '@/components/profile/AboutTab';
import { TrophiesTab } from '@/components/profile/TrophiesTab';
import { LookingForDuelToggle } from '@/components/profile/LookingForDuelToggle';
import { InlineEditField } from '@/components/profile/InlineEditField';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { usePlayerDuels } from '@/hooks/usePlayerDuels';
import { useReputation } from '@/hooks/useReputation';
import { useProfileTitles } from '@/hooks/useProfileTitles';
import { useAppToast } from '@/hooks/useAppToast';
import { useTranslation } from '@/i18n/useTranslation';
import { usePrivy } from '@privy-io/react-auth';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { PROFILE_LIMITS } from '@/lib/profile';
import type { ProfileRequest } from '@/lib/profile';

export default function MyProfilePage() {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const { authenticated, login } = usePrivy();
  const { activeWallet, walletAddress } = useActiveWallet();
  const displayAddress = (activeWallet?.address ?? '').toLowerCase();

  const { profile, isLoading, updateProfile, isSaving } = useMyProfile();
  const playerStats = usePlayerDuels(displayAddress as `0x${string}`, DEFAULT_CHAIN_ID);
  const reputation = useReputation(displayAddress as `0x${string}`, DEFAULT_CHAIN_ID);
  const { earned, unearned, top3 } = useProfileTitles(displayAddress as `0x${string}`, DEFAULT_CHAIN_ID);

  const repPct = reputation.total > 0 ? Math.round(reputation.score * 100) : null;

  const progressByTitleId = unearned.reduce<Record<string, { current: number; target: number } | null>>((acc, title) => {
    acc[title.id] = title.progressOf?.({
      address: displayAddress,
      duels: [...playerStats.activeDuels, ...playerStats.historyDuels],
      stats: playerStats,
      profile,
    }) ?? null;
    return acc;
  }, {});

  async function update(partial: ProfileRequest): Promise<void> {
    const merged: ProfileRequest = {
      nickname: profile?.nickname,
      battleCry: profile?.battleCry,
      aboutMe: profile?.aboutMe,
      pronouns: profile?.pronouns,
      region: profile?.region,
      lookingForDuel: profile?.lookingForDuel,
      games: profile?.games,
      ...partial,
    };
    try {
      await updateProfile(merged);
      appToast.success('toast.profileSaved');
    } catch (e) {
      appToast.error('toast.profileSaveFailed');
      throw e;
    }
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <User className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <p className="text-sm text-slate-500">{t('profile.signInToEdit')}</p>
        <Button className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700" onClick={login}>
          {t('nav.connectWallet')}
        </Button>
      </div>
    );
  }

  if (isLoading || !walletAddress) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={null}>
        <OAuthCallbackHandler />
      </Suspense>
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.dashboard')}
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ProfileHero
          walletAddress={displayAddress}
          profile={profile}
          stats={playerStats}
          reputationPercent={repPct}
          topTitles={top3}
          isOwner={true}
        />

        <div className="p-4 sm:p-6 flex flex-col gap-4">
          <InlineEditField
            label={t('profile.nickname')}
            placeholder={t('profile.nicknamePlaceholder')}
            value={profile?.nickname ?? null}
            maxLength={PROFILE_LIMITS.nickname}
            onSave={(v) => update({ nickname: v })}
            isSaving={isSaving}
          />
          <InlineEditField
            label={t('profile.battleCry')}
            placeholder={t('profile.battleCryPlaceholder')}
            value={profile?.battleCry ?? null}
            maxLength={PROFILE_LIMITS.battleCry}
            onSave={(v) => update({ battleCry: v })}
            isSaving={isSaving}
            italic
          />
          <LookingForDuelToggle
            value={profile?.lookingForDuel ?? false}
            onChange={(v) => void update({ lookingForDuel: v })}
            disabled={isSaving}
          />
        </div>

        <ProfileTabs
          hasReachOut={true}
          battlesContent={
            <BattlesTab walletAddress={displayAddress} stats={playerStats} isOwner />
          }
          aboutContent={
            <AboutTab profile={profile} isOwner onUpdate={update} isSaving={isSaving} />
          }
          reachOutContent={<SocialLinksSection socialLinks={profile?.socialLinks} />}
          trophiesContent={
            <TrophiesTab earned={earned} unearned={unearned} progressByTitleId={progressByTitleId} />
          }
        />
      </div>
    </div>
  );
}
