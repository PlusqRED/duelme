import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_TRACKED_CLIENTS,
  RELAY_POSTS_PER_MINUTE,
  relayClientAddress,
  resetRelayRateLimit,
  takeRelayRateLimit,
  trackedRelayClients,
} from '@/lib/relayerRateLimit';

beforeEach(() => {
  resetRelayRateLimit();
});

function takeMany(client: string, count: number, now: number) {
  return Array.from({ length: count }, () => takeRelayRateLimit(client, now));
}

describe('takeRelayRateLimit', () => {
  it('admits the first 30 posts in a minute and refuses the 31st', () => {
    const admitted = takeMany('203.0.113.7', RELAY_POSTS_PER_MINUTE, 0);

    expect(admitted.every((decision) => decision.allowed)).toBe(true);
    expect(takeRelayRateLimit('203.0.113.7', 1_000)).toEqual({ allowed: false, retryAfterSeconds: 59 });
  });

  it('opens a fresh window a minute after the first post, not after the last', () => {
    takeMany('203.0.113.7', RELAY_POSTS_PER_MINUTE, 0);

    expect(takeRelayRateLimit('203.0.113.7', 59_999).allowed).toBe(false);
    expect(takeRelayRateLimit('203.0.113.7', 60_000).allowed).toBe(true);
  });

  it('never asks a refused client to wait less than a second', () => {
    takeMany('203.0.113.7', RELAY_POSTS_PER_MINUTE, 0);

    expect(takeRelayRateLimit('203.0.113.7', 59_900)).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it('counts each client on its own', () => {
    takeMany('203.0.113.7', RELAY_POSTS_PER_MINUTE, 0);

    expect(takeRelayRateLimit('198.51.100.1', 0).allowed).toBe(true);
  });

  it('sweeps closed windows before tracking a new client', () => {
    for (let i = 0; i < MAX_TRACKED_CLIENTS; i += 1) {
      takeRelayRateLimit(`client-${i}`, 0);
    }

    takeRelayRateLimit('newcomer', 60_000);

    expect(trackedRelayClients()).toBe(1);
  });

  it('drops the oldest open window once the map is full, never growing past its cap', () => {
    takeMany('oldest', RELAY_POSTS_PER_MINUTE, 0);
    for (let i = 1; i < MAX_TRACKED_CLIENTS; i += 1) {
      takeRelayRateLimit(`client-${i}`, 1);
    }
    expect(takeRelayRateLimit('oldest', 2).allowed).toBe(false);

    takeRelayRateLimit('newcomer', 2);

    expect(trackedRelayClients()).toBe(MAX_TRACKED_CLIENTS);
    // Evicted, so its count started over.
    expect(takeRelayRateLimit('oldest', 3).allowed).toBe(true);
  });
});

describe('relayClientAddress', () => {
  it('takes the right-most X-Forwarded-For entry, which is the one Caddy wrote', () => {
    const headers = new Headers({ 'x-forwarded-for': '10.0.0.1, 198.51.100.1 , 203.0.113.7' });

    expect(relayClientAddress(headers)).toBe('203.0.113.7');
  });

  it('ignores the letter case of an IPv6 address', () => {
    const headers = new Headers({ 'x-forwarded-for': '2001:DB8::1' });

    expect(relayClientAddress(headers)).toBe('2001:db8::1');
  });

  it('puts a request with no address into one shared bucket', () => {
    const missing = relayClientAddress(new Headers());
    const empty = relayClientAddress(new Headers({ 'x-forwarded-for': ' ' }));

    expect(missing).toBe('unknown');
    expect(empty).toBe(missing);
  });
});
