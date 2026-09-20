'use client';

import { useTranslation } from '@/i18n/useTranslation';

interface PartialDataNoticeProps {
  /** `isError` from a paged duel reader: true when a page of the list is missing. */
  when: boolean;
}

/**
 * Says out loud that a list is short, rather than letting an incomplete history render as a
 * complete one. One component so the six screens that disclose this cannot drift into six
 * different warnings, and the seventh gets it by calling one thing.
 */
export function PartialDataNotice({ when }: PartialDataNoticeProps) {
  const { t } = useTranslation();

  if (!when) return null;

  return (
    <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {t('duel.partiallyLoaded')}
    </p>
  );
}
