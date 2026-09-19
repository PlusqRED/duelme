'use client';

import { useTranslation } from '@/i18n/useTranslation';

/**
 * Says out loud that a list is short.
 *
 * Every listing screen builds itself from a paged read, and a page that comes back `failure` —
 * an RPC gas cap or response-size limit on one 200-duel call — is a block of duels missing from
 * an otherwise normal-looking list. The alternative to this notice is rendering an incomplete
 * history as a complete one, which is the same screen with a wrong answer on it.
 *
 * It lives here rather than in each page so the six screens that disclose this cannot drift into
 * six different warnings, and so the seventh gets it by calling one component.
 */
export function PartialDataNotice({ when }: { when: boolean }) {
  const { t } = useTranslation();

  if (!when) return null;

  return (
    <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {t('duel.partiallyLoaded')}
    </p>
  );
}
