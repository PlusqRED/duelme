'use client';

import { use } from 'react';
import Link from 'next/link';
import { ReputationBadge } from '@/components/duel/ReputationBadge';
import { CopyableAddress } from '@/components/duel/CopyableAddress';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { SocialLinksDisplay } from '@/components/profile/SocialLinksDisplay';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/i18n/useTranslation';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { truncateAddress } from '@/lib/utils';
import { usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { ArrowLeft, User } from 'lucide-react';

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ walletAddress: string }>;
}) {
  const { walletAddress: rawAddress } = use(params);
  const walletAddress = rawAddress.toLowerCase();
  const isValidAddress = /^0x[a-f0-9]{40}$/.test(walletAddress);
  const { t, language } = useTranslation();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US';
  const { authenticated } = usePrivy();
  const { walletAddress: viewerAddress } = useActiveWallet();
  const isOwnProfile = viewerAddress === walletAddress;

  const { profile, isLoading } = useProfile(isValidAddress ? walletAddress : undefined);

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

  const nickname = profile?.nickname;
  const displayName = nickname ?? truncateAddress(walletAddress);
  const hasProfile = !!profile;
  const backHref = authenticated ? '/dashboard' : '/';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {authenticated ? t('nav.dashboard') : t('sidenav.hero')}
      </Link>

      <div className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-8 text-white sm:px-8">
          <div className="flex items-center gap-5 sm:gap-6">
            <ProfileAvatar profile={profile} displayName={displayName} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold sm:text-3xl">{displayName}</h1>
              {profile?.status && (
                <p className="mt-2 truncate text-sm text-white/80 sm:text-base">{profile.status}</p>
              )}
              <p className="mt-1 font-mono text-xs text-white/60">{truncateAddress(walletAddress)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6">
          {isOwnProfile && (
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              {t('profile.editYours')}
            </Link>
          )}

          {!hasProfile && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <User className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">{t('profile.noProfileYet')}</p>
            </div>
          )}

          {hasProfile && profile.socialLinks && (
            <SocialLinksDisplay socialLinks={profile.socialLinks} />
          )}

          {hasProfile && (
            <>
              {/* Personal info */}
              {(profile.firstName || profile.lastName) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {profile.firstName && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                        {t('profile.firstName')}
                      </div>
                      <p className="text-sm text-slate-900">{profile.firstName}</p>
                    </div>
                  )}
                  {profile.lastName && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                        {t('profile.lastName')}
                      </div>
                      <p className="text-sm text-slate-900">{profile.lastName}</p>
                    </div>
                  )}
                </div>
              )}

              {profile.gender && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('profile.gender')}
                  </div>
                  <p className="text-sm text-slate-900">{profile.gender}</p>
                </div>
              )}

              {profile.aboutMe && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('profile.aboutMe')}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-900">{profile.aboutMe}</p>
                </div>
              )}

              {profile.games && profile.games.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('profile.games')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.games.map((game) => (
                      <span
                        key={game}
                        className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                      >
                        {game}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Wallet + Reputation */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col items-center gap-3">
              <CopyableAddress address={walletAddress} />
              <ReputationBadge
                address={walletAddress as `0x${string}`}
                chainId={SUPPORTED_CHAINS.arbitrumSepolia.id}
                showStats
              />
            </div>
          </div>

          {/* Account dates */}
          {hasProfile && (
            <div className="grid gap-4 sm:grid-cols-2">
              {profile.createdAt && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('profile.memberSince')}
                  </div>
                  <p className="text-sm text-slate-900">
                    {new Date(profile.createdAt).toLocaleDateString(dateLocale, { dateStyle: 'medium' })}
                  </p>
                </div>
              )}
              {profile.updatedAt && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('profile.lastUpdated')}
                  </div>
                  <p className="text-sm text-slate-900">
                    {new Date(profile.updatedAt).toLocaleDateString(dateLocale, { dateStyle: 'medium' })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
