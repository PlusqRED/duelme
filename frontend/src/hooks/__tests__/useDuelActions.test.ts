// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { useWriteWithGas } from '@/hooks/useWriteWithGas';
import { FORWARDER_ADDRESSES } from '@/lib/constants';
import type { RelayerStatus } from '@/lib/relayRequest';

const CHAIN_ID = Number(Object.keys(FORWARDER_ADDRESSES)[0]);

const write = vi.hoisted(() => ({
  writeWithGas: vi.fn(async () => {}),
  relayWrite: vi.fn(async () => {}),
  probe: vi.fn<() => Promise<RelayerStatus>>(),
}));

vi.mock('@/hooks/useWriteWithGas', () => ({
  useWriteWithGas: () =>
    ({
      writeWithGas: write.writeWithGas,
      relayWrite: write.relayWrite,
      // The render saw the probe still in flight.
      isRelayEnabled: false,
      isRelayResolved: false,
      hash: undefined,
      isPending: false,
      isConfirming: false,
      isSuccess: false,
      receipt: undefined,
      error: null,
      reset: vi.fn(),
    }) satisfies ReturnType<typeof useWriteWithGas>,
}));

vi.mock('@/hooks/useDuelPermit', () => ({ useDuelPermit: () => vi.fn() }));
vi.mock('@/lib/relayApi', () => ({ fetchRelayerStatus: write.probe }));

const { useDuelActions } = await import('@/hooks/useDuelActions');

function renderActions() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);

  return renderHook(() => useDuelActions(CHAIN_ID), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDuelActions — a write sent before the relay probe answered', () => {
  it('waits for the answer and goes through the relayer when it is on', async () => {
    write.probe.mockResolvedValue({ available: true, chainId: CHAIN_ID });
    const { result } = renderActions();

    await act(() => result.current.cancelDuel(1n));

    expect(write.relayWrite).toHaveBeenCalledOnce();
    expect(write.writeWithGas).not.toHaveBeenCalled();
  });

  it('goes self-paid when the answer is that relaying is off', async () => {
    write.probe.mockResolvedValue({ available: false, chainId: null });
    const { result } = renderActions();

    await act(() => result.current.cancelDuel(1n));

    expect(write.writeWithGas).toHaveBeenCalledOnce();
    expect(write.relayWrite).not.toHaveBeenCalled();
  });
});
