'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppToast } from '@/hooks/useAppToast';
import type { TranslationKey } from '@/i18n/translations';
import { copyText } from '@/lib/clipboard';

/**
 * A Copy button's state: `copied` turns on only for a write `copyText` confirmed and turns itself
 * off after `confirmMs`; a refused write shows `failureKey` instead. `copy` resolves to whether the
 * text landed, for callers that add their own confirmation.
 */
export function useCopyFeedback(failureKey: TranslationKey, confirmMs = 2000) {
  const appToast = useAppToast();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const copy = useCallback(async (text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!(await copyText(text))) {
      setCopied(false);
      appToast.error(failureKey);
      return false;
    }
    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), confirmMs);
    return true;
  }, [appToast, failureKey, confirmMs]);

  return { copied, copy };
}
