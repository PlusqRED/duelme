'use client';

import { Button } from '@/components/ui/button';
import { Note } from '@/components/ui/note';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';
import { useTranslation } from '@/i18n/useTranslation';
import { ANALYTICS_SITE_ID } from '@/lib/analytics';
import { chooseAnalytics } from '@/lib/analyticsConsent';

const CHOICE_LINES = {
  granted: 'analytics.choice.granted',
  denied: 'analytics.choice.denied',
  unset: 'analytics.choice.unset',
} as const;

/** The answer on analytics as it stands in this browser, and the way to change it. */
export function AnalyticsChoice() {
  const { t } = useTranslation();
  const consent = useAnalyticsConsent();

  if (!ANALYTICS_SITE_ID) {
    return <Note icon="eye">{t('analytics.choice.off')}</Note>;
  }
  // Read after hydration; until then an empty block of about its height on a phone holds the place.
  if (consent === 'unknown') {
    return <div className="min-h-[100px]" aria-hidden />;
  }

  return (
    <div className="grid gap-3">
      <Note icon={consent === 'granted' ? 'eye' : 'lock'} tone="plain">
        {t(CHOICE_LINES[consent])}
      </Note>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={consent === 'denied' ? 'navy' : 'paper'}
          size="sm"
          aria-pressed={consent === 'denied'}
          onClick={() => chooseAnalytics('denied')}
        >
          {t('analytics.banner.deny')}
        </Button>
        <Button
          variant={consent === 'granted' ? 'navy' : 'paper'}
          size="sm"
          aria-pressed={consent === 'granted'}
          onClick={() => chooseAnalytics('granted')}
        >
          {t('analytics.banner.allow')}
        </Button>
      </div>
    </div>
  );
}
