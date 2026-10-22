'use client';

import Link from 'next/link';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { chooseAnalytics } from '@/lib/analyticsConsent';

/**
 * The one question about analytics, at the foot of the screen until it is answered. Under the
 * windows, which open over it; anonymous counting runs either way, only the yes adds more.
 */
export function ConsentBanner() {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-page px-gutter pb-[max(16px,env(safe-area-inset-bottom))]"
    >
      {/* Centred on a phone; on a wide screen in the column's corner, off the page's first lines. */}
      <div className="pointer-events-auto mx-auto grid max-w-[560px] animate-rise gap-3.5 rounded-[20px] border border-line bg-paper p-4 shadow-menu xs:p-5 wide:mr-0">
        <div className="flex items-start gap-3">
          <span className="grid size-10 flex-none place-items-center rounded-[12px] bg-canvas-deep text-ink">
            <Icon name="cookie" className="size-5" />
          </span>
          <div className="grid gap-1">
            <p id={titleId} className="text-body font-strong text-ink">
              {t('analytics.banner.title')}
            </p>
            <p className="text-body-sm text-pretty text-ink-2">
              {t('analytics.banner.text')}{' '}
              <Link href="/privacy" className="link">
                {t('analytics.banner.more')}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex gap-2 xs:justify-end">
          <Button variant="paper" size="sm" className="flex-1 xs:flex-none" onClick={() => chooseAnalytics('denied')}>
            {t('analytics.banner.deny')}
          </Button>
          <Button size="sm" className="flex-1 xs:flex-none" onClick={() => chooseAnalytics('granted')}>
            {t('analytics.banner.allow')}
          </Button>
        </div>
      </div>
    </section>
  );
}
