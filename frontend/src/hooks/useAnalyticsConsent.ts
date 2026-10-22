'use client';

import { useSyncExternalStore } from 'react';
import { currentConsent, subscribeToConsent, type ConsentState } from '@/lib/analyticsConsent';

function snapshot(): ConsentState {
  return currentConsent() ?? 'unset';
}

// The server cannot read the answer, so the first render in the browser cannot either: anything
// drawn from it waits for the render after hydration (see the language pitfall in CLAUDE.md).
function serverSnapshot(): ConsentState {
  return 'unknown';
}

/** The visitor's answer on analytics, here and in their other tabs; `unknown` until it has been read. */
export function useAnalyticsConsent(): ConsentState {
  return useSyncExternalStore(subscribeToConsent, snapshot, serverSnapshot);
}
