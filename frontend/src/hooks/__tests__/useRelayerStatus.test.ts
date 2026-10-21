// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RelayerStatusContext, useRelayerStatus } from '@/hooks/useRelayerStatus';
import { FORWARDER_ADDRESSES } from '@/lib/constants';
import type { RelayerStatus } from '@/lib/relayRequest';

const CHAIN_ID = Number(Object.keys(FORWARDER_ADDRESSES)[0]);

function renderStatus(status: RelayerStatus, chainId = CHAIN_ID) {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(RelayerStatusContext.Provider, { value: status }, children);

  return renderHook(() => useRelayerStatus(chainId), { wrapper });
}

afterEach(cleanup);

describe('useRelayerStatus', () => {
  it('relays on the chain the server relays for, from the first render', () => {
    const { result } = renderStatus({ available: true, chainId: CHAIN_ID });

    expect(result.current.isRelayEnabled).toBe(true);
  });

  it('does not relay when the server has no relayer', () => {
    const { result } = renderStatus({ available: false, chainId: null });

    expect(result.current.isRelayEnabled).toBe(false);
  });

  it('does not relay on a chain the server does not relay for', () => {
    const { result } = renderStatus({ available: true, chainId: CHAIN_ID + 1 });

    expect(result.current.isRelayEnabled).toBe(false);
  });

  it('does not relay outside the provider', () => {
    const { result } = renderHook(() => useRelayerStatus(CHAIN_ID));

    expect(result.current.isRelayEnabled).toBe(false);
  });
});
