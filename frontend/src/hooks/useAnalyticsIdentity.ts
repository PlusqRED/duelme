'use client';

import { useEffect } from 'react';
import { useLogin, useLogout, usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { forgetPlayer, identifyPlayer, trackEvent } from '@/lib/analytics';
import type { ConsentState } from '@/lib/analyticsConsent';
import { EMBEDDED_WALLET_CLIENT_TYPE } from '@/lib/walletSelection';

/**
 * Who the analytics say a visitor is. Signing in and out are counted for everyone, with nothing
 * that names the player; with consent the player is identified by their Privy id, the wallet as a
 * trait, and forgotten again on signing out or taking consent back.
 */
export function useAnalyticsIdentity(consent: ConsentState) {
  const { ready, authenticated, user } = usePrivy();
  const { activeWallet, walletAddress } = useActiveWallet();

  // Privy calls these for every sign-in and sign-out, wherever it was started.
  useLogin({
    onComplete: ({ isNewUser, wasAlreadyAuthenticated, loginMethod }) => {
      if (!wasAlreadyAuthenticated) {
        trackEvent('signed_in', { method: loginMethod ?? 'unknown', new_user: isNewUser ? 1 : 0 });
      }
    },
  });
  useLogout({ onSuccess: () => trackEvent('signed_out', {}) });

  const userId = ready && authenticated ? (user?.id ?? null) : null;
  const walletKind = activeWallet ? (activeWallet.walletClientType === EMBEDDED_WALLET_CLIENT_TYPE ? 'embedded' : 'external') : undefined;

  useEffect(() => {
    if (consent === 'unknown' || !ready) {
      return;
    }
    if (consent === 'granted' && userId) {
      identifyPlayer(userId, { wallet: walletAddress, wallet_kind: walletKind });
    } else {
      forgetPlayer();
    }
  }, [consent, ready, userId, walletAddress, walletKind]);
}
