import { describe, expect, it } from 'vitest';
import type { ConnectedWallet, User } from '@privy-io/react-auth';
import { selectWallet } from '@/lib/walletSelection';

const embeddedWallet = {
  address: '0x1111111111111111111111111111111111111111',
  walletClientType: 'privy',
} as ConnectedWallet;

const externalWallet = {
  address: '0x2222222222222222222222222222222222222222',
  walletClientType: 'metamask',
} as ConnectedWallet;

function userWithAccounts(types: string[]) {
  return {
    linkedAccounts: types.map((type) => ({ type })),
  } as User;
}

describe('selectWallet', () => {
  it('does not select a stale wallet after logout', () => {
    expect(selectWallet([embeddedWallet, externalWallet], null)).toBeNull();
  });

  it('prefers embedded wallet for social login users', () => {
    expect(
      selectWallet([externalWallet, embeddedWallet], userWithAccounts(['google_oauth']))
    ).toBe(embeddedWallet);
  });

  it('prefers external wallet for wallet login users', () => {
    expect(selectWallet([embeddedWallet, externalWallet], userWithAccounts(['wallet']))).toBe(
      externalWallet
    );
  });
});
