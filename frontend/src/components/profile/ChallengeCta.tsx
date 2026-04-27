'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sword } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';

interface ChallengeCtaProps {
  opponentAddress: string;
  variant?: 'inline' | 'sticky';
}

export function ChallengeCta({ opponentAddress, variant = 'inline' }: ChallengeCtaProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPref();
  const href = `/duel/create?opponent=${opponentAddress}`;

  const sticky = variant === 'sticky';

  return (
    <motion.div
      initial={sticky ? { y: 80, opacity: 0 } : false}
      animate={sticky ? { y: 0, opacity: 1 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={
        sticky
          ? 'fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-lg sm:hidden'
          : ''
      }
      style={sticky ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' } : undefined}
    >
      <motion.div
        animate={reduced ? {} : { scale: [1, 1.025, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Link
          href={href}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow transition-shadow hover:bg-indigo-700 hover:shadow-md min-h-[44px]"
        >
          <Sword className="h-4 w-4" />
          {t('profile.cta.challenge')}
        </Link>
      </motion.div>
    </motion.div>
  );
}
