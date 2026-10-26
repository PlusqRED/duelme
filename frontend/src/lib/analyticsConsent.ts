import { forgetPlayer, stopReplay, trackEvent } from '@/lib/analytics';
import { isRecord } from '@/lib/parsing';
import { browserStorage } from '@/lib/browserStorage';

/**
 * The visitor's answer on analytics. Without one, or with `denied`, the tracker counts visits,
 * clicks and errors with nothing that names the visitor; `granted` adds who the player is and
 * session recordings. Kept in this browser only, versioned like the create draft.
 */
export type ConsentChoice = 'granted' | 'denied';

/** The answer as a screen sees it: `unknown` until the browser has been read (the server's render, hydration). */
export type ConsentState = ConsentChoice | 'unset' | 'unknown';

export const ANALYTICS_CONSENT_KEY = 'duelme:analytics-consent:v1';

type ConsentStorage = Pick<Storage, 'getItem' | 'setItem'>;

function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === 'granted' || value === 'denied';
}

export function parseConsent(raw: string | null): ConsentChoice | null {
  if (!raw) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) && isConsentChoice(value.choice) ? value.choice : null;
  } catch {
    return null;
  }
}

export function readConsent(storage: ConsentStorage): ConsentChoice | null {
  try {
    return parseConsent(storage.getItem(ANALYTICS_CONSENT_KEY));
  } catch {
    return null;
  }
}

/** `false` when storage refused the write; the answer then holds until the page is left. */
export function saveConsent(storage: ConsentStorage, choice: ConsentChoice, now: Date = new Date()): boolean {
  try {
    storage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify({ choice, at: now.toISOString() }));
    return true;
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();
// An answer storage would not keep, so the banner does not come back on every render of this page.
let unsavedChoice: ConsentChoice | null = null;

/** The answer in this browser, for `useSyncExternalStore`. */
export function currentConsent(): ConsentChoice | null {
  const storage = browserStorage('local');
  return unsavedChoice ?? (storage ? readConsent(storage) : null);
}

/** Calls `onChange` when the answer changes here or in another tab. */
export function subscribeToConsent(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) {
      onChange();
    }
  };
  listeners.add(onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Takes the visitor's answer: keeps it and tells the screens, which act on it (`Analytics` starts
 * or stops the recording, `useAnalyticsIdentity` names the player or forgets them) — in this tab
 * now, and in another through the storage event.
 */
export function chooseAnalytics(choice: ConsentChoice) {
  const storage = browserStorage('local');
  unsavedChoice = storage && saveConsent(storage, choice) ? null : choice;
  // A no takes effect before it is counted, or its own event would still carry the player's id.
  if (choice === 'denied') {
    forgetPlayer();
    stopReplay();
  }
  trackEvent('analytics_choice', { choice });
  listeners.forEach((listener) => listener());
}
