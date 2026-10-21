'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';
import { readInviteSecretFromHash, readStoredInviteSecret, storeInviteSecret } from '@/lib/invite';

function subscribeToHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/**
 * The secret that lets the reader join or decline a private duel: from the link they opened, or,
 * for the duel's creator, from this browser, which keeps it for them. A creator who opens the page
 * without it gets it back in the address bar, so the link they copy invites.
 */
export function useDuelInvite(duelId: number, creator: string | undefined, viewer: string | undefined) {
  const contractAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID] ?? ZERO_ADDRESS;
  const isCreator = !!viewer && !!creator && viewer === creator.toLowerCase();
  const fromLink = useSyncExternalStore(subscribeToHash, readInviteSecretFromHash, () => null);
  const stored = useMemo(
    () => (isCreator && !fromLink ? readStoredInviteSecret(DEFAULT_CHAIN_ID, contractAddress, duelId) : null),
    [isCreator, fromLink, contractAddress, duelId]
  );
  const inviteSecret = fromLink ?? stored;

  useEffect(() => {
    if (!isCreator || !inviteSecret) return;
    storeInviteSecret(DEFAULT_CHAIN_ID, contractAddress, duelId, inviteSecret);
    if (window.location.hash.slice(1) !== inviteSecret) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${inviteSecret}`);
    }
  }, [isCreator, inviteSecret, duelId, contractAddress]);

  return inviteSecret;
}
