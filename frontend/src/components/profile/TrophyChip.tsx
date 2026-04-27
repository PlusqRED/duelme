'use client';

import { motion } from 'framer-motion';
import { Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import type { Title } from '@/lib/profileTitles';
import type { TranslationKey } from '@/i18n/translations';

interface TrophyChipProps {
  title: Title;
  earned: boolean;
  size?: 'sm' | 'md';
  showDescription?: boolean;
  progress?: { current: number; target: number } | null;
}

function camelize(id: string): string {
  return id.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function TrophyChip({ title, earned, size = 'md', showDescription, progress }: TrophyChipProps) {
  const { t } = useTranslation();
  const camel = camelize(title.id);
  const label = t(`trophy.${camel}.label` as TranslationKey);
  const desc = showDescription ? t(`trophy.${camel}.desc` as TranslationKey) : null;
  const Icon = earned ? Trophy : Lock;

  const baseStyle = earned
    ? 'border-amber-400 bg-amber-50 text-amber-900'
    : 'border-slate-200 bg-slate-50 text-slate-500';

  const showProgress = !earned && !title.isNegative && progress && progress.target > 0;
  const cowardly = !earned && title.isNegative;

  return (
    <motion.div
      whileHover={{ scale: 1.03, rotate: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
        baseStyle,
        size === 'sm' && 'px-2 py-0.5 text-xs',
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', earned ? 'text-amber-500' : 'text-slate-400')} />
      <span className="font-medium">{label}</span>
      {showDescription && desc && (
        <span className="ml-1 hidden text-xs font-normal opacity-80 sm:inline">— {desc}</span>
      )}
      {showProgress && (
        <span className="ml-1 text-xs font-mono opacity-70">
          ({progress.current} / {progress.target})
        </span>
      )}
      {cowardly && (
        <span className="ml-1 text-xs italic opacity-70">
          {t('profile.trophies.cowardlyHint')}
        </span>
      )}
    </motion.div>
  );
}
