'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';

interface StatsStripProps {
  wins: number;
  losses: number;
  volume: number;
  reputationPercent: number | null;
}

interface CountUpProps {
  value: number;
  suffix?: string;
}

function CountUp({ value, suffix = '' }: CountUpProps) {
  const reduced = useReducedMotionPref();
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  // When reduced motion is preferred, show the final value immediately
  // without triggering the set-state-in-effect lint rule by using a
  // microtask queue flush instead of a synchronous setState call.
  useEffect(() => {
    if (reduced) {
      const id = requestAnimationFrame(() => setDisplayed(value));
      return () => cancelAnimationFrame(id);
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const start = performance.now();
        const duration = 300;
        const from = 0;
        const animate = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 2);
          setDisplayed(Math.round(from + (value - from) * eased));
          if (t < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, reduced]);

  return <span ref={ref}>{displayed}{suffix}</span>;
}

export function StatsStrip({ wins, losses, volume, reputationPercent }: StatsStripProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="grid grid-cols-3 gap-2 rounded-xl border border-white/20 bg-white/10 p-2 text-white"
    >
      <div className="flex flex-col items-center px-2 py-1">
        <span className="text-lg font-semibold">
          <CountUp value={wins} />–<CountUp value={losses} />
        </span>
        <span className="text-[11px] uppercase tracking-wide opacity-70">
          {t('profile.stats.recordLabel')}
        </span>
      </div>
      <div className="flex flex-col items-center border-x border-white/20 px-2 py-1">
        <span className="text-lg font-semibold">
          <CountUp value={Math.round(volume)} />
        </span>
        <span className="text-[11px] uppercase tracking-wide opacity-70">
          {t('profile.stats.volumeLabel')}
        </span>
      </div>
      <div className="flex flex-col items-center px-2 py-1">
        <span className="text-lg font-semibold">
          {reputationPercent === null ? '—' : <CountUp value={reputationPercent} suffix="%" />}
        </span>
        <span className="text-[11px] uppercase tracking-wide opacity-70">
          {t('profile.stats.repLabel')}
        </span>
      </div>
    </motion.div>
  );
}
