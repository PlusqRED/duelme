'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { DEVLOG_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** The rest of the developer's note, opened on request, and the way to the devlog. */
export function DevNoteMore() {
  const { t } = useTranslation();
  const moreId = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div id={moreId} hidden={!isOpen} className="grid gap-2 pt-1.5 text-body-sm text-ink-2">
        <p>{t('indie.body')}</p>
        <p>{t('indie.blogText')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 max-xs:gap-x-3.5">
        <a
          href={DEVLOG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="link inline-flex min-h-11 items-center gap-[7px] text-body-sm max-xs:text-sm"
        >
          <Icon name="send" className="size-[18px]" />
          {t('indie.blogHandle')}
        </a>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={moreId}
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex min-h-11 cursor-pointer items-center gap-[7px] text-body-sm font-bold text-ink-2 max-xs:text-sm"
        >
          {t(isOpen ? 'indie.less' : 'indie.more')}
          <Icon name="chevron" className={cn('size-[18px] transition-[rotate] duration-300', isOpen && 'rotate-180')} />
        </button>
      </div>
    </>
  );
}
