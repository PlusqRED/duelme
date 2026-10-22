'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { ConsentBanner } from '@/components/analytics/ConsentBanner';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';
import { useAnalyticsIdentity } from '@/hooks/useAnalyticsIdentity';
import { ANALYTICS_SITE_ID, TRACKER_PATH, flushAnalytics, startReplay, stopReplay } from '@/lib/analytics';
import type { ConsentState } from '@/lib/analyticsConsent';

interface AnalyticsTrackerProps {
  siteId: string;
  /** The answer when the page loaded: only a yes lets the tracker record from its start. */
  recordsFromStart: boolean;
}

/** Rybbit's script; its tag is read once, so later answers act through `startReplay` / `stopReplay`. */
function AnalyticsTracker({ siteId, recordsFromStart }: AnalyticsTrackerProps) {
  const [holdsReplay] = useState(!recordsFromStart);
  return (
    <Script
      id="rybbit"
      src={`${TRACKER_PATH}/script.js`}
      strategy="afterInteractive"
      data-site-id={siteId}
      data-replay-sample-rate={holdsReplay ? '0' : undefined}
      onLoad={flushAnalytics}
    />
  );
}

/** Starts or stops the recording when the answer changes after the page loaded, in any tab. */
function useReplayFollowsConsent(consent: ConsentState) {
  const answered = useRef<ConsentState>('unknown');
  useEffect(() => {
    const before = answered.current;
    answered.current = consent;
    if (before === 'unknown' || before === consent) {
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
      <AnalyticsTracker siteId={ANALYTICS_SITE_ID} recordsFromStart={consent === 'granted'} />
      {consent === 'unset' && <ConsentBanner />}
    </>
  );
}
