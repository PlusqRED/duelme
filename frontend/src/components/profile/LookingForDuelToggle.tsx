'use client';

import { motion } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';

interface LookingForDuelToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export function LookingForDuelToggle({ value, onChange, disabled }: LookingForDuelToggleProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPref();

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
        <motion.span
          className="block h-3 w-3 rounded-full bg-emerald-500"
          animate={value && !reduced ? { opacity: [0.6, 1, 0.6] } : { opacity: value ? 1 : 0.3 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{t('profile.openForDuels')}</p>
        <p className="text-xs text-slate-500">{t('profile.openForDuelsHint')}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={t('profile.openForDuels')}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${value ? 'bg-emerald-500' : 'bg-slate-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 700, damping: 30 }}
          className={`absolute top-1.5 h-5 w-5 rounded-full bg-white shadow ${value ? 'right-1.5' : 'left-1.5'}`}
        />
      </button>
    </div>
  );
}
