import type { ConnectedWallet, User } from '@privy-io/react-auth';

/** Privy's walletClientType for its embedded wallet — the one shared vocabulary for selection, routing, and display. */
export const EMBEDDED_WALLET_CLIENT_TYPE = 'privy';

/**
 * Determines which wallet should be active based on user's login method.
 *
 * - Social login (Google/email) → prefer Privy embedded wallet
 * - Wallet login (MetaMask etc.) → prefer external wallet
 *
 * Shared between setActiveWalletForWagmi (Providers.tsx) and useActiveWallet hook.
 */
export function selectWallet(
  wallets: ConnectedWallet[],
  user: User | null,
): ConnectedWallet | null {
  if (!user) return null;
  if (!wallets.length) return null;

  const embedded = wallets.find((w) => w.walletClientType === EMBEDDED_WALLET_CLIENT_TYPE);
  const external = wallets.find((w) => w.walletClientType !== EMBEDDED_WALLET_CLIENT_TYPE);

  const hasSocialLogin = user?.linkedAccounts?.some(
    (a) => a.type === 'google_oauth' || a.type === 'email' || a.type === 'apple_oauth',
  );

  if (hasSocialLogin && embedded) return embedded;
  if (!hasSocialLogin && external) return external;

  return wallets[0];
}
