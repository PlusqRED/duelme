// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { quoteFees } from '@/lib/gasNeeds';

const ONE = SUPPORTED_CHAINS.arbitrum.id;
const FEES = { maxFeePerGas: 30_000_000n, maxPriorityFeePerGas: 0n };
const BASE_FEE = 10_000_000n;

const client = vi.hoisted(() => ({
  estimateFeesPerGas: vi.fn(async () => ({ maxFeePerGas: 30_000_000n, maxPriorityFeePerGas: 0n })),
  getBlock: vi.fn(async () => ({ baseFeePerGas: 10_000_000n })),
}));

vi.mock('wagmi', () => ({ usePublicClient: () => client }));

const { useFeeQuote } = await import('@/hooks/useFeeQuote');

function renderQuote(enabled: boolean) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useFeeQuote(ONE, enabled), { wrapper });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useFeeQuote', () => {
  it('testUseFeeQuoteQuotesWhatTheAppsWritesWouldOffer', async () => {
    const { result } = renderQuote(true);

    await waitFor(() => expect(result.current).toEqual(quoteFees(ONE, FEES, BASE_FEE)));
  });

  it('testUseFeeQuoteIsNullUntilTheNetworkAnswers', () => {
    const { result } = renderQuote(true);

    expect(result.current).toBeNull();
  });

  it('testUseFeeQuoteAsksNothingOnTheRelayedPath', () => {
    const { result } = renderQuote(false);

    expect(result.current).toBeNull();
    expect(client.estimateFeesPerGas).not.toHaveBeenCalled();
  });
});
