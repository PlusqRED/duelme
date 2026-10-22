// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeTracker {
  event: ReturnType<typeof vi.fn>;
  identify: ReturnType<typeof vi.fn>;
  clearUserId: ReturnType<typeof vi.fn>;
  startSessionReplay: ReturnType<typeof vi.fn>;
  stopSessionReplay: ReturnType<typeof vi.fn>;
  isSessionReplayActive: ReturnType<typeof vi.fn>;
}

function fakeTracker(): FakeTracker {
  return {
    event: vi.fn(),
    identify: vi.fn(),
    clearUserId: vi.fn(),
    startSessionReplay: vi.fn(),
    stopSessionReplay: vi.fn(),
    isSessionReplayActive: vi.fn(() => false),
  };
}

function installTracker(): FakeTracker {
  const tracker = fakeTracker();
  Reflect.set(window, 'rybbit', tracker);
  return tracker;
}

const SITE_ID = '0055bfb7e06b';

/** The module reads its site id once, when it is imported. */
async function loadAnalytics(siteId: string | undefined) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_RYBBIT_SITE_ID', siteId);
  return import('@/lib/analytics');
}

beforeEach(() => {
  Reflect.deleteProperty(window, 'rybbit');
  Reflect.deleteProperty(window, 'rrweb');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('parseSiteId', () => {
  it('takes a site id as the dashboard shows it', async () => {
    const { parseSiteId } = await loadAnalytics(undefined);

    expect(parseSiteId(` ${SITE_ID} `)).toBe(SITE_ID);
    expect(parseSiteId('1')).toBe('1');
  });

  it('turns anything else into no analytics at all', async () => {
    const { parseSiteId } = await loadAnalytics(undefined);

    for (const value of [undefined, '', '   ', 'abc def', '"><script>', 'A'.repeat(33), 'ABC']) {
      expect(parseSiteId(value)).toBeNull();
    }
  });
});

describe('without a site id', () => {
  it('sends nothing, even with a tracker on the page', async () => {
    const { trackEvent, identifyPlayer, ANALYTICS_SITE_ID } = await loadAnalytics('');
    const tracker = installTracker();

    trackEvent('signed_out', {});
    identifyPlayer('did:privy:1', { wallet: '0xabc' });

    expect(ANALYTICS_SITE_ID).toBeNull();
    expect(tracker.event).not.toHaveBeenCalled();
    expect(tracker.identify).not.toHaveBeenCalled();
  });
});

describe('with a site id', () => {
  it('sends an event with only its string and number props', async () => {
    const { trackEvent } = await loadAnalytics(SITE_ID);
    const tracker = installTracker();

    trackEvent('signing_opened', { action: 'joinDuel', chain_id: 421614, contract: '0xc', route: 'relay', duel_id: undefined });

    expect(tracker.event).toHaveBeenCalledWith('signing_opened', {
      action: 'joinDuel',
      chain_id: 421614,
      contract: '0xc',
      route: 'relay',
    });
  });

  it('holds calls made before the script ran and sends them, in order, once it has', async () => {
    const { trackEvent, identifyPlayer, flushAnalytics } = await loadAnalytics(SITE_ID);

    trackEvent('signed_in', { method: 'google', new_user: 1 });
    identifyPlayer('did:privy:1', { wallet: '0xabc', wallet_kind: 'embedded' });
    const tracker = installTracker();
    flushAnalytics();
    flushAnalytics();

    expect(tracker.event).toHaveBeenCalledTimes(1);
    expect(tracker.event).toHaveBeenCalledWith('signed_in', { method: 'google', new_user: 1 });
    expect(tracker.identify).toHaveBeenCalledWith('did:privy:1', { wallet: '0xabc', wallet_kind: 'embedded' });
    expect(tracker.event.mock.invocationCallOrder[0]).toBeLessThan(tracker.identify.mock.invocationCallOrder[0]);
  });

  it('keeps no more than a page’s worth while the script never comes', async () => {
    const { trackEvent, flushAnalytics } = await loadAnalytics(SITE_ID);

    for (let i = 0; i < 80; i += 1) {
      trackEvent('signed_out', {});
    }
    const tracker = installTracker();
    flushAnalytics();

    expect(tracker.event).toHaveBeenCalledTimes(50);
  });

  it('ignores a window.rybbit that is not the tracker', async () => {
    const { trackEvent, flushAnalytics } = await loadAnalytics(SITE_ID);
    Reflect.set(window, 'rybbit', { event: 'nope' });

    expect(() => {
      trackEvent('signed_out', {});
      flushAnalytics();
    }).not.toThrow();
  });

  it('never lets the tracker break the page, and says so in the console', async () => {
    const { trackEvent } = await loadAnalytics(SITE_ID);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tracker = installTracker();
    tracker.event.mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() => trackEvent('signed_out', {})).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it('forgets the player through the tracker', async () => {
    const { forgetPlayer } = await loadAnalytics(SITE_ID);
    const tracker = installTracker();

    forgetPlayer();

    expect(tracker.clearUserId).toHaveBeenCalledTimes(1);
  });
});

describe('startReplay', () => {
  // happy-dom refuses to load script files and fails them as they are added, so the scripts are
  // caught on their way into the page and their load or error is played by hand.
  function catchScripts() {
    const scripts: HTMLScriptElement[] = [];
    vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
      if (node instanceof HTMLScriptElement) {
        scripts.push(node);
      }
      return node;
    });
    return scripts;
  }

  it('brings the tracker’s rrweb once, then starts recording when it has loaded', async () => {
    const { startReplay, TRACKER_PATH } = await loadAnalytics(SITE_ID);
    const tracker = installTracker();
    const scripts = catchScripts();

    startReplay();
    startReplay();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].getAttribute('src')).toBe(`${TRACKER_PATH}/replay.js`);
    expect(tracker.startSessionReplay).not.toHaveBeenCalled();

    scripts[0].onload?.(new Event('load'));

    expect(tracker.startSessionReplay).toHaveBeenCalledTimes(1);
  });

  it('starts at once when rrweb is already on the page', async () => {
    const { startReplay } = await loadAnalytics(SITE_ID);
    const tracker = installTracker();
    Reflect.set(window, 'rrweb', {});
    const scripts = catchScripts();

    startReplay();

    expect(tracker.startSessionReplay).toHaveBeenCalledTimes(1);
    expect(scripts).toHaveLength(0);
  });

  it('leaves a recording that already runs alone', async () => {
    const { startReplay } = await loadAnalytics(SITE_ID);
    const tracker = installTracker();
    tracker.isSessionReplayActive.mockReturnValue(true);
    const scripts = catchScripts();

    startReplay();

    expect(tracker.startSessionReplay).not.toHaveBeenCalled();
    expect(scripts).toHaveLength(0);
  });

  it('tries again after rrweb failed to load', async () => {
    const { startReplay } = await loadAnalytics(SITE_ID);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    installTracker();
    const scripts = catchScripts();

    startReplay();
    scripts[0].onerror?.(new Event('error'));
    startReplay();

    expect(scripts).toHaveLength(2);
  });

  it('stops a recording through the tracker', async () => {
    const { stopReplay } = await loadAnalytics(SITE_ID);
    const tracker = installTracker();

    stopReplay();

    expect(tracker.stopSessionReplay).toHaveBeenCalledTimes(1);
  });
});
