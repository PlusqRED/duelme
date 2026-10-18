// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useWriteWithGas, WriteConfig } from '@/hooks/useWriteWithGas';
import { FORWARDER_ADDRESSES } from '@/lib/constants';
import type { RelayerStatus } from '@/lib/relayRequest';

const CHAIN_ID = Number(Object.keys(FORWARDER_ADDRESSES)[0]);
const INVITE_HASH = `0x${'1'.repeat(64)}` as const;

const write = vi.hoisted(() => ({
  writeWithGas: vi.fn<(config: WriteConfig) => Promise<void>>(async () => {}),
  relayWrite: vi.fn<(config: WriteConfig) => Promise<void>>(async () => {}),
  signPermit: vi.fn(async () => ({ deadline: 1n, v: 27, r: `0x${'2'.repeat(64)}`, s: `0x${'3'.repeat(64)}` })),
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

vi.mock('@/hooks/useDuelPermit', () => ({ useDuelPermit: () => write.signPermit }));
vi.mock('@/lib/relayApi', () => ({ fetchRelayerStatus: write.probe }));

const { useDuelActions } = await import('@/hooks/useDuelActions');

function renderActions() {
  // The probe keeps React Query's backoff; the test does not need to sit through it.
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);

  return renderHook(() => useDuelActions(CHAIN_ID), { wrapper });
}

function sentFunctionName(spy: typeof write.relayWrite) {
  return spy.mock.lastCall?.[0].functionName;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

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

  it('funds a relayed create with a permit once the probe says relaying is on', async () => {
    write.probe.mockResolvedValue({ available: true, chainId: CHAIN_ID });
    const { result } = renderActions();

    await act(() => result.current.createDuel(5_000_000n, INVITE_HASH));

    expect(write.signPermit).toHaveBeenCalledWith(5_000_000n);
    expect(sentFunctionName(write.relayWrite)).toBe('createDuelWithPermit');
  });

  it('decides the route of a create once, even if the probe would answer differently when asked again', async () => {
    write.probe
      .mockRejectedValueOnce(new Error('probe failed'))
      .mockRejectedValueOnce(new Error('probe failed'))
      .mockRejectedValueOnce(new Error('probe failed'))
      .mockResolvedValue({ available: true, chainId: CHAIN_ID });
    const { result } = renderActions();

    await act(() => result.current.createDuel(5_000_000n, INVITE_HASH));

    expect(sentFunctionName(write.writeWithGas)).toBe('createDuel');
    expect(write.relayWrite).not.toHaveBeenCalled();
  });

  it('counts as pending while it waits, so the button that sent it stays disabled', async () => {
    write.probe.mockReturnValue(new Promise<RelayerStatus>(() => {}));
    const { result } = renderActions();

    act(() => {
      void result.current.cancelDuel(1n);
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));
  });
});
