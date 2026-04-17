import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultChainKey } from '../defaultChain';

describe('getDefaultChainKey', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow === undefined) {
      // @ts-expect-error allow restoring undefined for SSR simulation
      delete globalThis.window;
    } else {
      vi.unstubAllGlobals();
    }
  });

  it('returns arbitrumSepolia when window is undefined (SSR)', () => {
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    expect(getDefaultChainKey()).toBe('arbitrumSepolia');
  });

  it('returns arbitrum on duelme.pro hostname', () => {
    vi.stubGlobal('window', { location: { hostname: 'duelme.pro' } });
    expect(getDefaultChainKey()).toBe('arbitrum');
  });

  it('returns arbitrumSepolia on dev.duelme.pro hostname', () => {
    vi.stubGlobal('window', { location: { hostname: 'dev.duelme.pro' } });
    expect(getDefaultChainKey()).toBe('arbitrumSepolia');
  });

  it('returns arbitrumSepolia on localhost', () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });
    expect(getDefaultChainKey()).toBe('arbitrumSepolia');
  });

  it('returns arbitrumSepolia on any unrecognized hostname', () => {
    vi.stubGlobal('window', { location: { hostname: 'preview.example.com' } });
    expect(getDefaultChainKey()).toBe('arbitrumSepolia');
  });
});

beforeEach(() => {
  // ensure fresh stubs each test
});
