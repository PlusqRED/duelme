'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { BattlesTab } from '@/components/profile/BattlesTab';
import { AboutTab } from '@/components/profile/AboutTab';
import { TrophiesTab } from '@/components/profile/TrophiesTab';
import { ChallengeCta } from '@/components/profile/ChallengeCta';
import { SocialLinksDisplay } from '@/components/profile/SocialLinksDisplay';
import { useProfile } from '@/hooks/useProfile';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { usePlayerDuels } from '@/hooks/usePlayerDuels';
import { useReputation } from '@/hooks/useReputation';
import { useProfileTitles } from '@/hooks/useProfileTitles';
import { useTranslation } from '@/i18n/useTranslation';
import { usePrivy } from '@privy-io/react-auth';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ walletAddress: string }>;
}) {
  const { walletAddress: rawAddress } = use(params);
  const walletAddress = rawAddress.toLowerCase();
  const isValidAddress = /^0x[a-f0-9]{40}$/.test(walletAddress);
  const { t } = useTranslation();
  const { authenticated } = usePrivy();
  const { walletAddress: viewerAddress } = useActiveWallet();
  const isOwner = !!viewerAddress && viewerAddress === walletAddress;

  const { profile, isLoading } = useProfile(isValidAddress ? walletAddress : undefined);
  const playerStats = usePlayerDuels(walletAddress as `0x${string}`, DEFAULT_CHAIN_ID);
  const reputation = useReputation(walletAddress as `0x${string}`, DEFAULT_CHAIN_ID);
  const { earned, unearned, top3 } = useProfileTitles(walletAddress as `0x${string}`, DEFAULT_CHAIN_ID);

  const repPct = reputation.total > 0 ? Math.round(reputation.score * 100) : null;

  const progressByTitleId = unearned.reduce<Record<string, { current: number; target: number } | null>>((acc, title) => {
    acc[title.id] = title.progressOf?.({
      address: walletAddress,
      duels: [...playerStats.activeDuels, ...playerStats.historyDuels],
      stats: playerStats,
      profile,
    }) ?? null;
    return acc;
  }, {});

  if (!isValidAddress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-sm text-slate-500">{t('duel.notFound')}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          {t('sidenav.hero')}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const backHref = authenticated ? '/dashboard' : '/';
  const hasReachOut = !!(profile?.socialLinks && (
    profile.socialLinks.steam || profile.socialLinks.telegram || profile.socialLinks.instagram
  ));

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24 sm:px-6 sm:py-12 sm:pb-12">
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {authenticated ? t('nav.dashboard') : t('sidenav.hero')}
        </Link>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ProfileHero
            walletAddress={walletAddress}
            profile={profile}
            stats={playerStats}
            reputationPercent={repPct}
            topTitles={top3}
            isOwner={isOwner}
          />
          <ProfileTabs
            hasReachOut={hasReachOut}
            battlesContent={
              <BattlesTab walletAddress={walletAddress} stats={playerStats} isOwner={isOwner} />
            }
            aboutContent={<AboutTab profile={profile} isOwner={false} />}
            reachOutContent={
              profile?.socialLinks ? (
                <SocialLinksDisplay socialLinks={profile.socialLinks} />
              ) : null
            }
            trophiesContent={
              <TrophiesTab earned={earned} unearned={unearned} progressByTitleId={progressByTitleId} />
            }
          />
        </div>
      </div>

      {!isOwner && <ChallengeCta opponentAddress={walletAddress} variant="sticky" />}
    </>
  );
}
