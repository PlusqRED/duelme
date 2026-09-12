import { EMBEDDED_WALLET_CLIENT_TYPE } from '@/lib/walletSelection';

// Display names for walletClientType values whose title-cased form is wrong.
// WalletConnect sessions report the underlying wallet's own client type
// (e.g. 'trust', 'zerion'), so there is no 'wallet_connect' entry.
const WALLET_DISPLAY_NAMES = new Map([
  ['metamask', 'MetaMask'],
  ['coinbase_wallet', 'Coinbase Wallet'],
  ['rabby_wallet', 'Rabby'],
  ['okx_wallet', 'OKX Wallet'],
]);

/**
 * Human-readable name of an external wallet ('metamask' → 'MetaMask').
 * Returns undefined for the Privy embedded wallet, Privy's 'unknown'
 * placeholder (unrecognized injected provider), or a missing type.
 */
export function getExternalWalletName(
  walletClientType: string | undefined
): string | undefined {
  if (
    !walletClientType ||
    walletClientType === EMBEDDED_WALLET_CLIENT_TYPE ||
    walletClientType === 'unknown'
  ) {
    return undefined;
  }

  return (
    WALLET_DISPLAY_NAMES.get(walletClientType) ??
    walletClientType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}
