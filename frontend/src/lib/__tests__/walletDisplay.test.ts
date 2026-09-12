import { describe, expect, it } from 'vitest';
import { getExternalWalletName } from '@/lib/walletDisplay';

describe('getExternalWalletName', () => {
  it('maps known walletClientType values to display names', () => {
    expect(getExternalWalletName('metamask')).toBe('MetaMask');
    expect(getExternalWalletName('coinbase_wallet')).toBe('Coinbase Wallet');
    expect(getExternalWalletName('rabby_wallet')).toBe('Rabby');
  });

  it('title-cases unmapped wallet types, including prototype-key lookalikes', () => {
    expect(getExternalWalletName('some_new_wallet')).toBe('Some New Wallet');
    expect(getExternalWalletName('toString')).toBe('ToString');
    expect(getExternalWalletName('constructor')).toBe('Constructor');
  });

  it('returns undefined for the embedded wallet, unrecognized providers, and missing type', () => {
    expect(getExternalWalletName('privy')).toBeUndefined();
    expect(getExternalWalletName('unknown')).toBeUndefined();
    expect(getExternalWalletName(undefined)).toBeUndefined();
  });
});
