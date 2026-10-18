// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { FORWARDER_ADDRESSES } from '@/lib/constants';

const CHAIN_ID = Number(Object.keys(FORWARDER_ADDRESSES)[0]);

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: new QueryClient() }, children);
}

function relayerAnswers() {
  return new Response(JSON.stringify({ available: true, chainId: CHAIN_ID }), { status: 200 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRelayerStatus', () => {
  it('is unresolved while the probe is in flight, so no flow plans its steps yet', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));

    const { result } = renderHook(() => useRelayerStatus(CHAIN_ID), { wrapper });

    expect(result.current.isRelayResolved).toBe(false);
    expect(result.current.isRelayEnabled).toBe(false);
  });

  it('tries a failed probe again instead of reading it as relaying off for the whole page', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(relayerAnswers());
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useRelayerStatus(CHAIN_ID), { wrapper });

    await waitFor(() => expect(result.current.isRelayResolved).toBe(true), { timeout: 3000 });
    expect(result.current.isRelayEnabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
