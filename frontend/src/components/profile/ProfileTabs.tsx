'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';

export type TabKey = 'battles' | 'about' | 'reachOut' | 'trophies';

interface ProfileTabsProps {
  hasReachOut: boolean;
  battlesContent: React.ReactNode;
  aboutContent: React.ReactNode;
  reachOutContent: React.ReactNode;
  trophiesContent: React.ReactNode;
}

const ALL_TABS: { key: TabKey; labelKey: `profile.tabs.${TabKey}` }[] = [
  { key: 'battles', labelKey: 'profile.tabs.battles' },
  { key: 'about', labelKey: 'profile.tabs.about' },
  { key: 'reachOut', labelKey: 'profile.tabs.reachOut' },
  { key: 'trophies', labelKey: 'profile.tabs.trophies' },
];

export function ProfileTabs({
  hasReachOut,
  battlesContent,
  aboutContent,
  reachOutContent,
  trophiesContent,
}: ProfileTabsProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState<TabKey>('battles');

  const visibleTabs = ALL_TABS.filter((tab) => tab.key !== 'reachOut' || hasReachOut);

  const contentMap: Record<TabKey, React.ReactNode> = {
    battles: battlesContent,
    about: aboutContent,
    reachOut: reachOutContent,
    trophies: trophiesContent,
  };

  return (
    <div>
      {/* Desktop tabs */}
      <div className="hidden border-b border-slate-200 sm:flex" role="tablist">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors min-h-[44px] ${
              active === tab.key ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t(tab.labelKey)}
            {active === tab.key && (
              <motion.span
                layoutId="profile-tab-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Desktop content */}
      <div className="hidden p-6 sm:block" role="tabpanel">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {contentMap[active]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile stacked sections */}
      <div className="flex flex-col gap-6 p-4 sm:hidden">
        {visibleTabs.map((tab) => (
          <section key={tab.key}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              {t(tab.labelKey)}
            </h2>
            {contentMap[tab.key]}
          </section>
        ))}
      </div>
    </div>
  );
}
