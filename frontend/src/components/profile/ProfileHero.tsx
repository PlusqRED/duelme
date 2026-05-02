'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Identicon } from './Identicon';
import { StatsStrip } from './StatsStrip';
import { TrophyChip } from './TrophyChip';
import { ChallengeCta } from './ChallengeCta';
import { ShareProfileButton } from './ShareProfileButton';
import { CopyableAddress } from '@/components/duel/CopyableAddress';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { useTranslation } from '@/i18n/useTranslation';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';
import { truncateAddress } from '@/lib/utils';
import type { Profile } from '@/lib/profile';
import type { Title } from '@/lib/profileTitles';
import type { PlayerStats } from '@/hooks/usePlayerDuels';

interface ProfileHeroProps {
  walletAddress: string;
  profile: Profile | null;
  stats: PlayerStats;
  reputationPercent: number | null;
  topTitles: Title[];
  isOwner: boolean;
}

export function ProfileHero({
  walletAddress,
  profile,
  stats,
  reputationPercent,
  topTitles,
  isOwner,
}: ProfileHeroProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPref();
  const avatarSrc = useAvatarUrl(walletAddress, profile);
  const displayName = profile?.nickname ?? truncateAddress(walletAddress);
  const totalDuels = stats.activeDuels.length + stats.historyDuels.length;
  const showStats = totalDuels > 0;

  return (
    <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
      <div className="absolute right-3 top-3">
        <ShareProfileButton walletAddress={walletAddress} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4 sm:flex-row sm:items-start"
      >
        <motion.div
          whileHover={!isOwner && !reduced ? { scale: 1.02 } : undefined}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          {avatarSrc.startsWith('http') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 rounded-full border-2 border-white/30 object-cover"
            />
          ) : (
            <Identicon walletAddress={walletAddress} size={80} className="border-2 border-white/30" />
          )}
        </motion.div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-xl font-bold truncate">{displayName}</h1>
          {profile?.battleCry && (
            <p className="mt-1 text-sm italic text-white/85 truncate">&ldquo;{profile.battleCry}&rdquo;</p>
          )}
          {profile?.lookingForDuel && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs">
              <motion.span
                className="block h-2 w-2 rounded-full bg-emerald-400"
                animate={reduced ? {} : { opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {t('profile.openForDuels')}
            </div>
          )}

          <div className="mt-4">
            {showStats ? (
              <StatsStrip
                wins={stats.wins}
                losses={stats.losses}
                volume={stats.totalWagered}
                reputationPercent={reputationPercent}
              />
            ) : (
              <p className="text-sm text-white/80">{t('profile.freshMeat')}</p>
            )}
          </div>

          {topTitles.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {topTitles.map((title, i) => (
                <motion.div
                  key={title.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                >
                  <TrophyChip title={title} earned size="sm" />
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <CopyableAddress address={walletAddress} />
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {isOwner ? (
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 min-h-[44px]"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('profile.editProfile')}
              </Link>
            ) : (
              <div className="hidden sm:block">
                <ChallengeCta opponentAddress={walletAddress} variant="inline" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
