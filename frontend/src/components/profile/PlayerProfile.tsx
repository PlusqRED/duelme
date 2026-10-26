'use client';

import { usePrivy } from '@privy-io/react-auth';
import { getAddress } from 'viem';
import { BackLink } from '@/components/duel/room/BackLink';
import { PageColumn } from '@/components/layout/PageColumn';
import { ProfileAbout } from '@/components/profile/ProfileAbout';
import { ProfileFace } from '@/components/profile/ProfileFace';
import { ProfileHead } from '@/components/profile/ProfileHead';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { RecordCard } from '@/components/profile/RecordCard';
import { ReputationCard } from '@/components/profile/ReputationCard';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useProfile } from '@/hooks/useProfile';
import { useReputation } from '@/hooks/useReputation';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { truncateAddress } from '@/lib/utils';

/**
 * Any player's profile as an opponent weighs them up: who they are, their record on the
 * reputation scale and in duels, and what they wrote about themselves. The owner gets the way to
 * edit it.
 */
export function PlayerProfile({ address }: { address: `0x${string}` }) {
  const { t } = useTranslation();
  const { authenticated } = usePrivy();
  const { walletAddress } = useActiveWallet();
  const { profile, isLoading } = useProfile(address);
  const reputation = useReputation(address, DEFAULT_CHAIN_ID);
  const shown = getAddress(address);

  if (isLoading) {
    return <ProfileSkeleton />;
  }
  const name = profile?.nickname ?? truncateAddress(shown);

  return (
    <PageColumn>
      <BackLink href={authenticated ? '/dashboard' : '/duels/public'}>
        {t(authenticated ? 'room.back.mine' : 'room.back.public')}
      </BackLink>
      <ProfileHead address={shown} profile={profile} level={reputation.isLoading || reputation.isError ? null : reputation.level}>
        {walletAddress === address && (
          <LocaleLink href="/profile" className={buttonVariants({ variant: 'paper', size: 'sm' })}>
            <Icon name="pen" className="size-4" />
            {t('profile.editYours')}
          </LocaleLink>
        )}
      </ProfileHead>
      <div className="grid items-start gap-5 split:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="grid gap-5">
          <ReputationCard
            reputation={reputation}
            face={<ProfileFace profile={profile} displayName={name} address={shown} className="size-full" />}
          />
          <RecordCard address={address} />
        </div>
        <ProfileAbout profile={profile} />
      </div>
    </PageColumn>
  );
}
