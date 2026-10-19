import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The config is read once per process; each test loads a fresh module with its own env.
async function relayerStatus() {
  const { getRelayerStatus } = await import('@/lib/relayerConfig');
  return getRelayerStatus();
}

const VALID_KEY = `0x${'11'.repeat(32)}`;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_DEFAULT_CHAIN_KEY', 'arbitrumSepolia');
  vi.stubEnv('RELAYER_DAILY_BUDGET_WEI', '');
  vi.stubEnv('RELAYER_GLOBAL_DAILY_BUDGET_WEI', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getRelayerStatus', () => {
  it('tells the client that relaying is on, and for which chain, and nothing more', async () => {
    vi.stubEnv('RELAYER_PRIVATE_KEY', VALID_KEY);

    expect(await relayerStatus()).toStrictEqual({ available: true, chainId: 421614 });
  });

  it('reads as off when no relayer key is set', async () => {
    vi.stubEnv('RELAYER_PRIVATE_KEY', '');

    expect(await relayerStatus()).toStrictEqual({ available: false, chainId: null });
  });

  it('reads as off, rather than throwing on every page, when the key is not a private key', async () => {
    vi.stubEnv('RELAYER_PRIVATE_KEY', `0x${'00'.repeat(32)}`);

    expect(await relayerStatus()).toStrictEqual({ available: false, chainId: null });
  });

  it('says once in the server log why relaying is off, since pages are only told that it is', async () => {
    vi.stubEnv('RELAYER_PRIVATE_KEY', `0x${'00'.repeat(32)}`);
    const { getRelayerStatus } = await import('@/lib/relayerConfig');

    getRelayerStatus();
    getRelayerStatus();

    expect(console.error).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledWith(
      '[relay] disabled:',
      'RELAYER_PRIVATE_KEY is not a valid secp256k1 private key.'
    );
  });
});
