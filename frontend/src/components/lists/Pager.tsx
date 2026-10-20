'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { PAGE_GAP, pageCount, pageNumbers } from '@/lib/pages';
import { cn } from '@/lib/utils';

interface PagerProps {
  /** The page shown, counted from 1, already kept inside the list. */
  page: number;
  /** How many items the whole list holds. */
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}

/**
 * The way through a long list: back and on, the page numbers around the one shown, and which items
 * these are. Nothing for a list that fits on one page. After a turn the current page's number takes
 * the focus, since the step that was pressed may have just turned off; where the list is narrow, the
 * numbers take a line of their own.
 */
export function Pager({ page, total, pageSize, onPage }: PagerProps) {
  const { t } = useTranslation();
  const currentRef = useRef<HTMLButtonElement>(null);
  const isTurning = useRef(false);

  useEffect(() => {
    if (!isTurning.current) return;
    isTurning.current = false;
    currentRef.current?.focus({ preventScroll: true });
  }, [page]);

  const count = pageCount(total, pageSize);
  if (count <= 1) {
    return null;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  function turnTo(next: number) {
    isTurning.current = true;
    onPage(next);
  }

  return (
    <nav aria-label={t('lists.pages')} className="@container/pager mt-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="paper" size="sm" onClick={() => turnTo(page - 1)} disabled={page <= 1} className="mb-1 @max-[480px]/pager:flex-1">
          <Icon name="arrow-left" className="size-[18px]" />
          {t('action.previous')}
        </Button>
        <ol className="flex gap-1 @max-[480px]/pager:order-3 @max-[480px]/pager:basis-full @max-[480px]/pager:justify-center">
          {pageNumbers(page, count).map((entry, index) =>
            entry === PAGE_GAP ? (
              <li key={`gap-${index}`} aria-hidden="true" className="grid h-11 w-6 place-items-center text-ink-3">
                …
              </li>
            ) : (
              <li key={entry}>
                <button
                  ref={entry === page ? currentRef : undefined}
                  type="button"
                  onClick={() => turnTo(entry)}
                  aria-current={entry === page ? 'page' : undefined}
                  aria-label={t('lists.page', { n: entry })}
                  className={cn(
                    'h-11 min-w-11 cursor-pointer rounded-full px-2 font-strong text-ink-2 tabular-nums transition-colors duration-200 hover:bg-paper hover:text-ink',
                    'aria-[current=page]:bg-ink aria-[current=page]:text-paper'
                  )}
                >
                  {entry}
                </button>
              </li>
            )
          )}
        </ol>
        <Button variant="paper" size="sm" onClick={() => turnTo(page + 1)} disabled={page >= count} className="mb-1 @max-[480px]/pager:flex-1">
          {t('action.next')}
          <Icon name="chevron-right" className="size-[18px]" />
        </Button>
        <p className="ml-auto text-note text-ink-3 tabular-nums @max-[480px]/pager:order-4 @max-[480px]/pager:m-0 @max-[480px]/pager:basis-full @max-[480px]/pager:text-center">
          {t('lists.shown', { from, to, total })}
        </p>
      </div>
    </nav>
  );
}
