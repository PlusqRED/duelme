'use client';

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';

export function useAppToast() {
  const { t } = useTranslation();

  const info = useCallback((key: TranslationKey, params?: TranslationParams) => {
    toast.info(t(key, params));
  }, [t]);

  const success = useCallback((key: TranslationKey, params?: TranslationParams) => {
    toast.success(t(key, params));
  }, [t]);

  const error = useCallback((key: TranslationKey, params?: TranslationParams) => {
    toast.error(t(key, params));
  }, [t]);

  const transactionError = useCallback((err: unknown, fallbackKey: TranslationKey = 'toast.transactionFailed') => {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('reject') || message.includes('denied')) {
      error('toast.transactionRejected');
      return;
    }

    error(fallbackKey);
  }, [error]);

  return useMemo(() => ({
    info,
    success,
    error,
    transactionError,
  }), [info, success, error, transactionError]);
}
