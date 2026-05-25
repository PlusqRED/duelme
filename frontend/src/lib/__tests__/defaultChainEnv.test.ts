import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// process.env.NEXT_PUBLIC_DEFAULT_CHAIN_KEY is read once at module init.
// Use vi.resetModules() + vi.stubEnv() to verify the resolution logic.

describe('DEFAULT_CHAIN_KEY resolves from NEXT_PUBLIC_DEFAULT_CHAIN_KEY', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('picks arbitrum (mainnet) when env=arbitrum', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_CHAIN_KEY', 'arbitrum');
    const constants = await import('../constants');
    expect(constants.DEFAULT_CHAIN_KEY).toBe('arbitrum');
    expect(constants.DEFAULT_CHAIN_ID).toBe(42161);
    expect(constants.DEFAULT_CHAIN.usdt).toBe('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9');
  });

  it('picks arbitrumSepolia (testnet) when env=arbitrumSepolia', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_CHAIN_KEY', 'arbitrumSepolia');
    const constants = await import('../constants');
    expect(constants.DEFAULT_CHAIN_KEY).toBe('arbitrumSepolia');
    expect(constants.DEFAULT_CHAIN_ID).toBe(421614);
  });

  it('falls back to arbitrumSepolia when env is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_CHAIN_KEY', '');
    const constants = await import('../constants');
    expect(constants.DEFAULT_CHAIN_KEY).toBe('arbitrumSepolia');
    expect(constants.DEFAULT_CHAIN_ID).toBe(421614);
  });

  it('falls back to arbitrumSepolia when env has an invalid value', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_CHAIN_KEY', 'mainnet');
    const constants = await import('../constants');
    expect(constants.DEFAULT_CHAIN_KEY).toBe('arbitrumSepolia');
  });
});

describe('isNonProductionHost mirrors the build-time chain key', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false when build targets arbitrum (mainnet)', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_CHAIN_KEY', 'arbitrum');
    const { isNonProductionHost } = await import('../defaultChain');
    expect(isNonProductionHost()).toBe(false);
  });

  it('is true when build targets arbitrumSepolia (testnet)', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_CHAIN_KEY', 'arbitrumSepolia');
    const { isNonProductionHost } = await import('../defaultChain');
    expect(isNonProductionHost()).toBe(true);
  });
});
