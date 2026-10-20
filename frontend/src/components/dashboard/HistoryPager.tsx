'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

interface HistoryPagerProps {
  page: number;
  pages: number;
  /** The index of the first row shown, and how many rows the page has, out of 'total'. */
  from: number;
  count: number;
  total: number;
  onPage: (page: number) => void;
}

/**
 * The history's pages: a step either way, every page's number and which rows are shown. After a
 * step the current page's number takes the focus, since the step that was pressed may have just
 * turned off. Where the column is narrow, the numbers take a line of their own under the steps.
 */
export function HistoryPager({ page, pages, from, count, total, onPage }: HistoryPagerProps) {
  const { t } = useTranslation();
  const currentRef = useRef<HTMLButtonElement>(null);
  const isTurning = useRef(false);

  useEffect(() => {
    if (!isTurning.current) return;
    isTurning.current = false;
    currentRef.current?.focus({ preventScroll: true });
  }, [page]);

  function turnTo(next: number) {
    isTurning.current = true;
    onPage(next);
  }

  return (
    <nav aria-label={t('dash.pages')} className="mt-4 flex flex-wrap items-center gap-2.5">
      <Button variant="paper" size="sm" disabled={page <= 1} onClick={() => turnTo(page - 1)} className={'mb-1 @max-[480px]/desk:flex-1'}>
        <Icon name="arrow-left" className="size-[18px]" />
        {t('action.previous')}
      </Button>
      <ol className={'flex gap-1 @max-[480px]/desk:order-3 @max-[480px]/desk:basis-full @max-[480px]/desk:justify-center'}>
        {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
          <li key={number}>
            <button
              ref={number === page ? currentRef : undefined}
              type="button"
              aria-label={t('dashboard.pageSummary', { current: number, total: pages })}
              aria-current={number === page ? 'page' : undefined}
              onClick={() => turnTo(number)}
              className={cn(
                'h-11 min-w-11 cursor-pointer rounded-full font-strong text-ink-2 tabular-nums transition-colors duration-200 hover:bg-paper hover:text-ink',
                'aria-[current=page]:bg-ink aria-[current=page]:text-paper'
              )}
            >
              {number}
            </button>
          </li>
        ))}
      </ol>
      <Button variant="paper" size="sm" disabled={page >= pages} onClick={() => turnTo(page + 1)} className={'mb-1 @max-[480px]/desk:flex-1'}>
        {t('action.next')}
        <Icon name="chevron-right" className="size-[18px]" />
      </Button>
      <p className={'ml-auto text-note text-ink-3 tabular-nums @max-[480px]/desk:order-4 @max-[480px]/desk:m-0 @max-[480px]/desk:basis-full @max-[480px]/desk:text-center'}>
        {t('dash.shown', { from: from + 1, to: from + count, total })}
      </p>
    </nav>
  );
}
