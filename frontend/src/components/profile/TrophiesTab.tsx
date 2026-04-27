'use client';

import { motion } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';
import { TrophyChip } from './TrophyChip';
import type { Title } from '@/lib/profileTitles';

interface TrophiesTabProps {
  earned: Title[];
  unearned: Title[];
  progressByTitleId: Record<string, { current: number; target: number } | null>;
}

export function TrophiesTab({ earned, unearned, progressByTitleId }: TrophiesTabProps) {
  const { t } = useTranslation();

  if (earned.length === 0 && unearned.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm italic text-slate-400">
        {t('profile.empty.trophies')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {earned.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-600">
            {t('profile.trophies.earned')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {earned.map((title, i) => (
              <motion.div
                key={title.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <TrophyChip title={title} earned showDescription />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {unearned.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('profile.trophies.notYet')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {unearned.map((title, i) => (
              <motion.div
                key={title.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <TrophyChip
                  title={title}
                  earned={false}
                  showDescription
                  progress={progressByTitleId[title.id]}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
