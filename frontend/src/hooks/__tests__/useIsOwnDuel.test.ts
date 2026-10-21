// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CREATOR = '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23';

const reader = vi.hoisted(() => ({ authenticated: false, wallet: undefined as string | undefined }));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ authenticated: reader.authenticated }) }));
vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ walletAddress: reader.wallet }) }));

const { useIsOwnDuel } = await import('@/hooks/useIsOwnDuel');

beforeEach(() => {
  Object.assign(reader, { authenticated: false, wallet: undefined });
});

afterEach(cleanup);

describe('useIsOwnDuel', () => {
  it('counts no duel as a signed-out reader’s own', () => {
    const { result } = renderHook(() => useIsOwnDuel());

    expect(result.current({ creator: CREATOR })).toBe(false);
  });

  it('counts the duel a signed-in reader created as theirs, whatever the address’s case', () => {
    Object.assign(reader, { authenticated: true, wallet: CREATOR.toLowerCase() });
    const { result } = renderHook(() => useIsOwnDuel());

    expect(result.current({ creator: CREATOR })).toBe(true);
  });

  it('counts another player’s duel as not the reader’s', () => {
    Object.assign(reader, { authenticated: true, wallet: '0x4bfa1486661d6faa5300923bd684f261ae4776a5' });
    const { result } = renderHook(() => useIsOwnDuel());

    expect(result.current({ creator: CREATOR })).toBe(false);
  });

  it('counts every duel as the reader’s own while their wallet is still unknown', () => {
    reader.authenticated = true;
    const { result } = renderHook(() => useIsOwnDuel());

    expect(result.current({ creator: CREATOR })).toBe(true);
  });
});
