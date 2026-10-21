'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { Suspense } from 'react';
import { BackLink } from '@/components/duel/room/BackLink';
import { PageColumn } from '@/components/layout/PageColumn';
import { OAuthCallbackHandler } from '@/components/profile/OAuthCallbackHandler';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { ProfileFace } from '@/components/profile/ProfileFace';
import { ProfileHead } from '@/components/profile/ProfileHead';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { RecordCard } from '@/components/profile/RecordCard';
import { ReputationCard } from '@/components/profile/ReputationCard';
import { SignedOutProfile } from '@/components/profile/SignedOutProfile';
import { SocialLinksSection } from '@/components/profile/SocialLinksSection';
import { buttonVariants } from '@/components/ui/button';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useReputation } from '@/hooks/useReputation';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { profilePath } from '@/lib/navigation';
import { truncateAddress } from '@/lib/utils';

/**
 * The signed-in player's own profile: the head others see, what they can edit beside it — their
 * name, status, words and games, and their linked accounts — and their record, with the way to the
 * profile as everyone else sees it.
 */
export function MyProfile() {
  const { t } = useTranslation();
  const { ready, authenticated, login } = usePrivy();
  const { activeWallet, walletAddress } = useActiveWallet();
  const { profile, isLoading, updateProfile, isSaving } = useMyProfile();
  const reputation = useReputation(walletAddress, DEFAULT_CHAIN_ID);

  if (ready && !authenticated) {
    return <SignedOutProfile onSignIn={login} />;
  }
  if (!ready || isLoading || !walletAddress || !activeWallet) {
    return <ProfileSkeleton />;
  }
  const shown = activeWallet.address;
  const name = profile?.nickname ?? truncateAddress(shown);

  return (
    <PageColumn>
      <Suspense fallback={null}>
        <OAuthCallbackHandler />
      </Suspense>
      <BackLink href="/dashboard">{t('room.back.mine')}</BackLink>
      <ProfileHead address={shown} profile={profile} level={reputation.isLoading || reputation.isError ? null : reputation.level}>
        <Link href={profilePath(walletAddress)} className={buttonVariants({ variant: 'paper', size: 'sm' })}>
          {t('profile.publicLink')}
        </Link>
      </ProfileHead>
      <div className="grid items-start gap-5 split:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-5">
          <ProfileEditor profile={profile} isSaving={isSaving} updateProfile={updateProfile} />
          <SocialLinksSection socialLinks={profile?.socialLinks ?? null} />
        </div>
        <div className="grid gap-5">
          <ReputationCard
            reputation={reputation}
            face={<ProfileFace profile={profile} displayName={name} address={shown} className="size-full" />}
          />
          <RecordCard address={walletAddress} />
        </div>
      </div>
    </PageColumn>
  );
}
