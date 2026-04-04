'use client';

import { useCallback } from 'react';
import { useTranslation } from '@/i18n/useTranslation';

export function useTimeAgo() {
  const { t } = useTranslation();

  return useCallback((timestamp: bigint) => {
    const seconds = Math.floor(Date.now() / 1000) - Number(timestamp);
    if (seconds < 60) return t('openDuels.timeAgo.now');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('openDuels.timeAgo.minutes', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('openDuels.timeAgo.hours', { n: hours });
    const days = Math.floor(hours / 24);
    return t('openDuels.timeAgo.days', { n: days });
  }, [t]);
}
