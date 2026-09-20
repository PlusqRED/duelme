import { describe, expect, it, vi } from 'vitest';
import { resolveRpcUrl } from '@/lib/wagmi';

const FALLBACK = 'https://fallback.example/rpc';

describe('resolveRpcUrl', () => {
  it('returns the env URL when it is a valid absolute https URL', () => {
    expect(resolveRpcUrl('https://rpc.example/v2/key', FALLBACK)).toBe(
      'https://rpc.example/v2/key'
    );
  });

  it('returns the env URL when it is a valid absolute http URL', () => {
    expect(resolveRpcUrl('http://localhost:8545', FALLBACK)).toBe('http://localhost:8545');
  });

  it('falls back when the env var is undefined (local dev with no secret)', () => {
    expect(resolveRpcUrl(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it('falls back when the env var is an empty string (GitHub secret not set)', () => {
    expect(resolveRpcUrl('', FALLBACK)).toBe(FALLBACK);
  });

  it('falls back when the env var is just an API key — the prod regression', () => {
    // Reproduces the May 2026 incident: the secret held the provider's API key with
    // no protocol/host. The browser's fetch() would resolve it relative to the
    // current page and POST RPC payloads to our own domain.
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(resolveRpcUrl('Zv2HJdY2afTS0Pv75x', FALLBACK)).toBe(FALLBACK);
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('falls back when the env var is missing the protocol', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(resolveRpcUrl('rpc.example/v2/key', FALLBACK)).toBe(FALLBACK);
    consoleWarnSpy.mockRestore();
  });

  it('falls back when the URL uses a non-http(s) protocol (e.g. ws://)', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // ws:// is a real protocol — URL parses cleanly, so we have to reject it
    // explicitly. wagmi http() transport wouldn't accept ws:// anyway.
    expect(resolveRpcUrl('ws://example.com/rpc', FALLBACK)).toBe(FALLBACK);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('non-http(s) protocol')
    );
    consoleWarnSpy.mockRestore();
  });
});
