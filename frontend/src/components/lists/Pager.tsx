'use client';

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
 * these are. Nothing for a list that fits on one page. On a phone the numbers take a line of their own.
 */
export function Pager({ page, total, pageSize, onPage }: PagerProps) {
  const { t } = useTranslation();
  const count = pageCount(total, pageSize);
  if (count <= 1) {
    return null;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav aria-label={t('lists.pages')} className="mt-4 flex flex-wrap items-center gap-2.5">
      <Button variant="paper" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1} className="max-xs:flex-1">
        <Icon name="chevron-right" className="size-[18px] rotate-180" />
        {t('action.previous')}
      </Button>
      <ol className="flex gap-1 max-xs:order-3 max-xs:basis-full max-xs:justify-center">
        {pageNumbers(page, count).map((entry, index) =>
          entry === PAGE_GAP ? (
            <li key={`gap-${index}`} aria-hidden="true" className="grid h-11 w-6 place-items-center text-ink-3">
              …
            </li>
          ) : (
            <li key={entry}>
              <button
                type="button"
                onClick={() => onPage(entry)}
                aria-current={entry === page ? 'page' : undefined}
                aria-label={t('lists.page', { n: entry })}
                className={cn(
                  'h-11 min-w-11 cursor-pointer rounded-full px-2 font-bold tabular-nums transition-colors',
                  entry === page ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper hover:text-ink'
                )}
              >
                {entry}
              </button>
            </li>
          )
        )}
      </ol>
      <Button variant="paper" size="sm" onClick={() => onPage(page + 1)} disabled={page >= count} className="max-xs:flex-1">
        {t('action.next')}
        <Icon name="chevron-right" className="size-[18px]" />
      </Button>
      <p className="ml-auto text-sm text-ink-3 tabular-nums max-xs:order-4 max-xs:basis-full max-xs:text-center">
        {t('lists.shown', { from, to, total })}
      </p>
    </nav>
  );
}
