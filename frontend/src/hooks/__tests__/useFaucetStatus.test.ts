// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({
  identityToken: 'token' as string | null,
  walletAddress: '0x32a3fe56f4fee248e4f19ca3d4374a018ac9aa23' as string | undefined,
  getFaucetStatus: vi.fn(async () => ({ enabled: false })),
}));

vi.mock('@privy-io/react-auth', () => ({ useIdentityToken: () => ({ identityToken: session.identityToken }) }));
vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ walletAddress: session.walletAddress }) }));
vi.mock('@/lib/faucetApi', () => ({ getFaucetStatus: session.getFaucetStatus }));

const { useFaucetStatus } = await import('@/hooks/useFaucetStatus');

function renderStatus() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useFaucetStatus(), { wrapper });
}

beforeEach(() => {
  session.identityToken = 'token';
  session.walletAddress = '0x32a3fe56f4fee248e4f19ca3d4374a018ac9aa23';
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useFaucetStatus', () => {
  it('asks the backend with the player\'s token', async () => {
    const { result } = renderStatus();

    await waitFor(() => expect(result.current.data).toEqual({ enabled: false }));
    expect(session.getFaucetStatus).toHaveBeenCalledWith('token');
  });

  it('does not ask before there is a token to show', () => {
    session.identityToken = null;
    renderStatus();

    expect(session.getFaucetStatus).not.toHaveBeenCalled();
  });

  it('does not ask for a visitor without a wallet', () => {
    session.walletAddress = undefined;
    renderStatus();

    expect(session.getFaucetStatus).not.toHaveBeenCalled();
  });
});
