import type { AnalyticsEvents, SigningProps } from '@/lib/analytics';
import type { FlowError } from '@/lib/flowError';
import type { FlowPlace } from '@/lib/signingSteps';

/** What a signing window's events read of it at one render. */
export interface SigningSnapshot {
  open: boolean;
  place: FlowPlace;
  error: FlowError | null;
  /** The write is sent and the chain is confirming it. */
  confirming: boolean;
  /** A create whose receipt has not named the new duel yet: its Done waits for the id. */
  awaitsDuelId: boolean;
  props: SigningProps;
}

type SigningEventName = Extract<keyof AnalyticsEvents, `signing_${string}`>;

export type SigningEvent = {
  [TName in SigningEventName]: { name: TName; props: AnalyticsEvents[TName] };
}[SigningEventName];

// Rybbit keeps 2KB of properties per event, and the start of a wallet's or a chain's message says
// what went wrong; viem's dumps run on for pages.
const MAX_DETAIL = 300;

// An address or a transaction hash in an error would tie an anonymous event to a wallet.
const LONG_HEX = /0x[0-9a-fA-F]{40,}/g;

function shortDetail(detail: string | null): string | undefined {
  return detail?.replace(LONG_HEX, '0x…').slice(0, MAX_DETAIL);
}

function isDone(snapshot: SigningSnapshot | null): boolean {
  return snapshot !== null && snapshot.open && snapshot.place === 'success' && !snapshot.awaitsDuelId;
}

/**
 * The events a window raises between two renders: opened; failed, once per error it shows; done,
 * once it reaches Done (a create's with the new duel's id); abandoned, closed before Done, from
 * where it stood, or left, closed while the chain confirmed. The first snapshot is the previous
 * render's, or null on the window's first.
 */
export function signingEvents(before: SigningSnapshot | null, now: SigningSnapshot): SigningEvent[] {
  const events: SigningEvent[] = [];
  const wasOpen = before?.open ?? false;

  if (now.open && !wasOpen) {
    events.push({ name: 'signing_opened', props: now.props });
  }

  if (now.open && now.error && now.error !== before?.error) {
    const { kind, canRetry, detail } = now.error;
    events.push({
      name: 'signing_failed',
      props: { ...now.props, place: now.place, kind, retry: canRetry ? 1 : 0, detail: shortDetail(detail) },
    });
  }

  if (isDone(now) && !isDone(before)) {
    events.push({ name: 'signing_done', props: now.props });
  }

  if (before && wasOpen && !now.open) {
    if (before.place !== 'success') {
      const name = before.confirming ? 'signing_left' : 'signing_abandoned';
      events.push({ name, props: { ...before.props, place: before.place } });
    } else if (before.awaitsDuelId) {
      // Closed on Done before the receipt named the duel: it was made all the same.
      events.push({ name: 'signing_done', props: before.props });
    }
  }

  return events;
}
