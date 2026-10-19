'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';

interface PartialDataNoticeProps {
  /** `isError` from a paged duel reader: a page of the list is missing, or the last read of it failed. */
  when: boolean;
  /** Reads the list again. */
  onRetry: () => void;
}

/**
 * Says out loud that a list may be short or out of date, rather than letting it render as complete
 * and current, and offers to read it again. One component so the six screens that disclose this
 * cannot drift into six different warnings, and the seventh gets it by calling one thing.
 */
export function PartialDataNotice({ when, onRetry }: PartialDataNoticeProps) {
  const { t } = useTranslation();

  if (!when) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[18px] bg-orange-wash px-4 py-3.5 font-label text-orange-ink ring-[1.5px] ring-orange-line ring-inset"
    >
      <Icon name="alert" />
      <p className="flex-[1_1_260px]">{t('duel.partiallyLoaded')}</p>
      <Button variant="paper" size="sm" onClick={() => onRetry()}>
        {t('action.tryAgain')}
      </Button>
    </div>
  );
}
