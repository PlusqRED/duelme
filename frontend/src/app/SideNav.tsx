'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';

const sections: { id: string; labelKey: TranslationKey }[] = [
  { id: 'hero', labelKey: 'sidenav.hero' },
  { id: 'public-duels', labelKey: 'sidenav.publicDuels' },
  { id: 'recent-duels', labelKey: 'sidenav.recentDuels' },
  { id: 'games', labelKey: 'sidenav.games' },
  { id: 'how-it-works', labelKey: 'sidenav.howItWorks' },
  { id: 'trust', labelKey: 'sidenav.trust' },
  { id: 'onboarding', labelKey: 'sidenav.onboarding' },
  { id: 'reputation', labelKey: 'sidenav.reputation' },
];

export function SideNav() {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState('hero');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id);
          }
        },
        { rootMargin: '-40% 0px -55% 0px' }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  function handleClick(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <nav className="fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 xl:flex">
      <div className="flex flex-col items-start gap-1.5">
        {sections.map(({ id, labelKey }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              onClick={() => handleClick(id)}
              className="group flex items-center gap-3 rounded-lg py-2 pl-2.5 pr-4 transition-all duration-200 hover:bg-white/80 hover:shadow-sm"
            >
              {/* Dot */}
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'scale-125 bg-slate-800'
                    : 'bg-slate-300 group-hover:bg-slate-400'
                }`}
              />
              {/* Label */}
              <span
                className={`text-sm transition-all duration-200 ${
                  isActive
                    ? 'font-semibold text-slate-800'
                    : 'font-medium text-slate-400 group-hover:text-slate-500'
                }`}
              >
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
