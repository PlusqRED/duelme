// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDuelInvite } from '@/hooks/useDuelInvite';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import { readStoredInviteSecret, storeInviteSecret } from '@/lib/invite';

const DUEL_ID = 7;
const CREATOR = '0xAbCdEf0000000000000000000000000000001234';
const VIEWER_CREATOR = CREATOR.toLowerCase();
const STRANGER = '0x9999999999999999999999999999999999999999';
const SECRET = `0x${'ab'.repeat(32)}` as const;
const OTHER_SECRET = `0x${'cd'.repeat(32)}` as const;
const CONTRACT = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];

function openPage(hash = '') {
  window.history.replaceState(null, '', `/duel/${DUEL_ID}?from=list${hash}`);
}

beforeEach(() => {
  localStorage.clear();
  openPage();
});

afterEach(cleanup);

describe('useDuelInvite', () => {
  it('takes the secret from the link the reader opened', () => {
    openPage(`#${SECRET}`);

    const { result } = renderHook(() => useDuelInvite(DUEL_ID, CREATOR, STRANGER));

    expect(result.current).toBe(SECRET);
  });

  it('ignores a hash that is no secret', () => {
    openPage('#results');

    const { result } = renderHook(() => useDuelInvite(DUEL_ID, CREATOR, STRANGER));

    expect(result.current).toBeNull();
  });

  it('follows a link opened again with another secret', () => {
    openPage(`#${SECRET}`);
    const { result } = renderHook(() => useDuelInvite(DUEL_ID, CREATOR, STRANGER));

    act(() => {
      openPage(`#${OTHER_SECRET}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(result.current).toBe(OTHER_SECRET);
  });

  it('gives the creator back the secret this browser kept, in the address bar too', () => {
    storeInviteSecret(DEFAULT_CHAIN_ID, CONTRACT, DUEL_ID, SECRET);

    const { result } = renderHook(() => useDuelInvite(DUEL_ID, CREATOR, VIEWER_CREATOR));

    expect(result.current).toBe(SECRET);
    expect(window.location.hash).toBe(`#${SECRET}`);
    expect(window.location.search).toBe('?from=list');
  });

  it('keeps the secret a creator opened the page with', () => {
    openPage(`#${SECRET}`);

    renderHook(() => useDuelInvite(DUEL_ID, CREATOR, VIEWER_CREATOR));

    expect(readStoredInviteSecret(DEFAULT_CHAIN_ID, CONTRACT, DUEL_ID)).toBe(SECRET);
  });

  it('never hands another reader the secret this browser kept', () => {
    storeInviteSecret(DEFAULT_CHAIN_ID, CONTRACT, DUEL_ID, SECRET);

    const { result } = renderHook(() => useDuelInvite(DUEL_ID, CREATOR, STRANGER));

    expect(result.current).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('waits for the reader’s wallet before reading what this browser kept', () => {
    storeInviteSecret(DEFAULT_CHAIN_ID, CONTRACT, DUEL_ID, SECRET);
    const { result, rerender } = renderHook(({ viewer }) => useDuelInvite(DUEL_ID, CREATOR, viewer), {
      initialProps: { viewer: undefined as string | undefined },
    });
    expect(result.current).toBeNull();

    rerender({ viewer: VIEWER_CREATOR });

    expect(result.current).toBe(SECRET);
  });

  it('keeps nothing for a reader who holds no secret', () => {
    renderHook(() => useDuelInvite(DUEL_ID, CREATOR, VIEWER_CREATOR));

    expect(readStoredInviteSecret(DEFAULT_CHAIN_ID, CONTRACT, DUEL_ID)).toBeNull();
    expect(window.location.hash).toBe('');
  });
});
