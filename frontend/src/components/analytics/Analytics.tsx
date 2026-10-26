'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { ConsentBanner } from '@/components/analytics/ConsentBanner';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';
import { useAnalyticsIdentity } from '@/hooks/useAnalyticsIdentity';
import { LANGUAGES } from '@/i18n/language';
import { localePath } from '@/i18n/localePath';
import { ANALYTICS_SITE_ID, TRACKER_PATH, flushAnalytics, startReplay, stopReplay } from '@/lib/analytics';
import type { ConsentState } from '@/lib/analyticsConsent';

// A profile's address is its path: counted as one page in each language, a profile names no wallet.
const PROFILE_PATHS = JSON.stringify(LANGUAGES.map((language) => `${localePath('/profile', language)}/*`));

/** Records while the answer is a yes: from the page's load, from a yes given later, in any tab. */
function useReplayFollowsConsent(consent: ConsentState) {
  useEffect(() => {
    if (consent !== 'granted') {
      return;
    }
    startReplay();
    return stopReplay;
  }, [consent]);
}

/**
 * DuelMe's analytics, on every page: the tracker, who the visitor is, and the banner that asks
 * until they answer. Without a site id (a local run, CI) none of it is there.
 */
export function Analytics() {
  const consent = useAnalyticsConsent();
  useAnalyticsIdentity(consent);
  useReplayFollowsConsent(consent);

  if (!ANALYTICS_SITE_ID || consent === 'unknown') {
    return null;
  }

  return (
    <>
      {/* Rybbit records only through startReplay: the tag holds its own recording back for good. */}
      <Script
        id="rybbit"
        src={`${TRACKER_PATH}/script.js`}
        strategy="afterInteractive"
        data-site-id={ANALYTICS_SITE_ID}
        data-replay-sample-rate="0"
        data-mask-patterns={PROFILE_PATHS}
        onLoad={flushAnalytics}
      />
      {consent === 'unset' && <ConsentBanner />}
    </>
  );
}
