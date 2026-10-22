import type { AnalyticsEvents, SigningProps } from '@/lib/analytics';
import type { FlowError } from '@/lib/flowError';
import type { FlowPlace } from '@/lib/signingSteps';

/** What a signing window's events read of it at one render. */
export interface SigningSnapshot {
  open: boolean;
  place: FlowPlace;
  error: FlowError | null;
  props: SigningProps;
}

type SigningEventName = Extract<keyof AnalyticsEvents, `signing_${string}`>;

export type SigningEvent = {
  [TName in SigningEventName]: { name: TName; props: AnalyticsEvents[TName] };
}[SigningEventName];

// Rybbit keeps 2KB of properties per event, and the start of a wallet's or a chain's message says
// what went wrong; viem's dumps run on for pages.
const MAX_DETAIL = 300;

/**
 * A create's Done can come before its receipt names the duel; its event waits for the id. Only a
 * create has neither: every other window names its duel, or counts the duels of a Take.
 */
function awaitsDuelId(snapshot: SigningSnapshot): boolean {
  return snapshot.props.duel_id === undefined && snapshot.props.duels === undefined;
}

function isDone(snapshot: SigningSnapshot | null): boolean {
  return snapshot !== null && snapshot.open && snapshot.place === 'success' && !awaitsDuelId(snapshot);
}

/**
 * The events a window raises between two renders: opened; failed, once per error it shows; done,
 * once it reaches Done (a create's with the new duel's id); abandoned, closed before Done, from
 * where it stood. The first snapshot is the previous render's, or null on the window's first.
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
      props: { ...now.props, place: now.place, kind, retry: canRetry ? 1 : 0, detail: detail?.slice(0, MAX_DETAIL) },
    });
  }

  if (isDone(now) && !isDone(before)) {
    events.push({ name: 'signing_done', props: now.props });
  }

  if (before && wasOpen && !now.open) {
    if (before.place !== 'success') {
      events.push({ name: 'signing_abandoned', props: { ...before.props, place: before.place } });
    } else if (awaitsDuelId(before)) {
      // Closed on Done before the receipt named the duel: it was made all the same.
      events.push({ name: 'signing_done', props: before.props });
    }
  }

  return events;
}
