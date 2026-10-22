'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { ConsentBanner } from '@/components/analytics/ConsentBanner';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';
import { useAnalyticsIdentity } from '@/hooks/useAnalyticsIdentity';
import { ANALYTICS_SITE_ID, TRACKER_PATH, flushAnalytics, startReplay, stopReplay } from '@/lib/analytics';
import type { ConsentState } from '@/lib/analyticsConsent';

/** Records while the answer is a yes: from the page's load, from a yes given later, in any tab. */
function useReplayFollowsConsent(consent: ConsentState) {
  const answered = useRef<ConsentState>('unknown');
  useEffect(() => {
    const before = answered.current;
    answered.current = consent;
    if (before === consent) {
      return;
    }
    if (consent === 'granted') {
      startReplay();
    } else if (before === 'granted') {
      stopReplay();
    }
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
        onLoad={flushAnalytics}
      />
      {consent === 'unset' && <ConsentBanner />}
    </>
  );
}
