import type { FlowErrorKind } from '@/lib/flowError';
import { isRecord } from '@/lib/parsing';
import type { WriteRoute } from '@/lib/writeRoute';

/**
 * Product analytics through DuelMe's own Rybbit (ops/rybbit). The tracker is served from this site
 * under `TRACKER_PATH`, which the Caddyfiles route to Rybbit, so the CSP stays 'self' and blockers
 * that match analytics hosts leave it be. Nothing here throws: analytics never stops a page.
 */

/** Where the Caddyfiles serve the tracker's paths (script, events, recordings). */
export const TRACKER_PATH = '/t';

const SITE_ID_PATTERN = /^[a-z0-9]{1,32}$/;

/** A Rybbit site id as its dashboard shows it, or null for anything else (unset included). */
export function parseSiteId(value: string | undefined): string | null {
  const id = value?.trim() ?? '';
  return SITE_ID_PATTERN.test(id) ? id : null;
}

/** The Rybbit site this build reports to; null, as on a local run or in CI, loads no tracker at all. */
export const ANALYTICS_SITE_ID = parseSiteId(process.env.NEXT_PUBLIC_RYBBIT_SITE_ID);

type PropValue = string | number;

/** A signing window's flow, sent with every event it raises. */
export interface SigningProps {
  /** The contract function the window sends. */
  action: string;
  chain_id: number;
  /** A duel id names a duel only together with the contract that issued it. */
  contract: string;
  route: WriteRoute;
  duel_id?: number;
  /** A Take over several duels. */
  duels?: number;
  /** The stake in USDT, as a decimal string. */
  stake?: string;
  wallet?: 'embedded' | 'external';
}

/** Every event the app sends and what it carries; Rybbit records clicks and page views itself. */
export interface AnalyticsEvents {
  signing_opened: SigningProps;
  signing_failed: SigningProps & { place: string; kind: FlowErrorKind; retry: 0 | 1; detail?: string };
  signing_done: SigningProps;
  /** Closed before Done, from wherever the flow stood. */
  signing_abandoned: SigningProps & { place: string };
  signed_in: { method: string; new_user: 0 | 1 };
  signed_out: Record<string, never>;
  analytics_choice: { choice: 'granted' | 'denied' };
}

/** What a player is known by once they agree: their wallet, and whether Privy made it. */
export interface PlayerTraits {
  wallet?: string;
  embedded_wallet?: 0 | 1;
}

interface RybbitApi {
  event(name: string, properties?: Record<string, PropValue>): void;
  identify(userId: string, traits?: Record<string, PropValue>): void;
  clearUserId(): void;
  startSessionReplay(): void;
  stopSessionReplay(): void;
  isSessionReplayActive(): boolean;
}

const API_METHODS = ['event', 'identify', 'clearUserId', 'startSessionReplay', 'stopSessionReplay', 'isSessionReplayActive'];

function isRybbitApi(value: unknown): value is RybbitApi {
  return isRecord(value) && API_METHODS.every((method) => typeof value[method] === 'function');
}

function tracker(): RybbitApi | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const api: unknown = Reflect.get(window, 'rybbit');
  return isRybbitApi(api) ? api : null;
}

type TrackerCall = (api: RybbitApi) => void;

// Calls made before the script has run wait here, a page's worth at most; a blocked script keeps
// them for nothing, which is all a blocked script should cost.
const MAX_PENDING = 50;
const pending: TrackerCall[] = [];

function run(api: RybbitApi, call: TrackerCall) {
  try {
    call(api);
  } catch (error) {
    console.warn('Analytics call failed', error);
  }
}

function withTracker(call: TrackerCall) {
  if (!ANALYTICS_SITE_ID) {
    return;
  }
  const api = tracker();
  if (api) {
    run(api, call);
  } else if (pending.length < MAX_PENDING) {
    pending.push(call);
  }
}

/** Sends what waited for the tracker; called once its script has run. */
export function flushAnalytics() {
  const api = tracker();
  if (api) {
    pending.splice(0).forEach((call) => run(api, call));
  }
}

/** Only strings and numbers: Rybbit drops anything else, and an absent prop is left out. */
function toProps(props: object): Record<string, PropValue> {
  const entries: [string, unknown][] = Object.entries(props);
  return Object.fromEntries(
    entries.filter((entry): entry is [string, PropValue] => typeof entry[1] === 'string' || typeof entry[1] === 'number')
  );
}

export function trackEvent<TName extends keyof AnalyticsEvents>(name: TName, props: AnalyticsEvents[TName]) {
  const properties = toProps(props);
  withTracker((api) => api.event(name, properties));
}

/** Ties what this browser sends from now on to the player. Only once they agreed (`useAnalyticsIdentity`). */
export function identifyPlayer(userId: string, traits: PlayerTraits) {
  const properties = toProps(traits);
  withTracker((api) => api.identify(userId, properties));
}

/** Unties this browser from the player, as on signing out or taking the agreement back. */
export function forgetPlayer() {
  withTracker((api) => api.clearUserId());
}

let isReplayLoading = false;

/**
 * Starts recording the session once the player agrees on this page. The tracker starts recording
 * by itself only when its tag allowed it (`AnalyticsTracker` holds it back until there is consent);
 * after that, Rybbit 2.9's recorder starts only once rrweb is on the page, which it fetches for
 * itself only in the first case. So this brings the tracker's own copy of rrweb and then starts it.
 */
export function startReplay() {
  withTracker((api) => {
    if (api.isSessionReplayActive() || isReplayLoading) {
      return;
    }
    if (Reflect.get(window, 'rrweb') !== undefined) {
      api.startSessionReplay();
      return;
    }
    isReplayLoading = true;
    const script = document.createElement('script');
    script.src = `${TRACKER_PATH}/replay.js`;
    script.async = true;
    script.onload = () => {
      isReplayLoading = false;
      withTracker((loaded) => loaded.startSessionReplay());
    };
    script.onerror = () => {
      isReplayLoading = false;
      console.warn('Session replay could not load');
    };
    document.head.appendChild(script);
  });
}

export function stopReplay() {
  withTracker((api) => api.stopSessionReplay());
}
