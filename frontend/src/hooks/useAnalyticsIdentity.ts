'use client';

import { useEffect } from 'react';
import { useLogin, useLogout, usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { forgetPlayer, identifyPlayer, trackEvent, walletKindOf } from '@/lib/analytics';
import type { ConsentState } from '@/lib/analyticsConsent';

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
  const walletKind = walletKindOf(activeWallet);

  useEffect(() => {
    if (consent === 'unknown') {
      return;
    }
    // Without a yes the player is forgotten at once: Rybbit sends an id it kept from before with
    // its first page view, which comes long before Privy is ready.
    if (consent !== 'granted') {
      forgetPlayer();
      return;
    }
    if (!ready) {
      return;
    }
    if (userId) {
      identifyPlayer(userId, { wallet: walletAddress, wallet_kind: walletKind });
    } else {
      forgetPlayer();
    }
  }, [consent, ready, userId, walletAddress, walletKind]);
}
