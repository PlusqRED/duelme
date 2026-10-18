// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { FORWARDER_ADDRESSES } from '@/lib/constants';
import { mockFetch } from '@/lib/__tests__/helpers/mockFetch';

const CHAIN_ID = Number(Object.keys(FORWARDER_ADDRESSES)[0]);

function renderStatus() {
  // The hook keeps React Query's backoff; the test does not need to sit through it.
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);

  return renderHook(() => useRelayerStatus(CHAIN_ID), { wrapper });
}

function relayerAnswers() {
  return mockFetch({ json: async () => ({ available: true, chainId: CHAIN_ID }) });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRelayerStatus', () => {
  it('is unresolved while the probe is in flight, so no flow plans its steps yet', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));

    const { result } = renderStatus();

    expect(result.current.isRelayResolved).toBe(false);
    expect(result.current.isRelayEnabled).toBe(false);
  });

  it('asks again after a request that failed instead of reading it as relaying off', async () => {
    const fetchMock = relayerAnswers().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { result } = renderStatus();

    await waitFor(() => expect(result.current.isRelayResolved).toBe(true));
    expect(result.current.isRelayEnabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('asks again after a gateway error instead of reading it as relaying off', async () => {
    const fetchMock = relayerAnswers().mockResolvedValueOnce({ ok: false, status: 502 } as Response);

    const { result } = renderStatus();

    await waitFor(() => expect(result.current.isRelayResolved).toBe(true));
    expect(result.current.isRelayEnabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
