// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({
  ready: true,
  authenticated: false,
  login: vi.fn(),
  activeWallet: undefined as { address: string; walletClientType: string } | undefined,
}));
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ ready: session.ready, authenticated: session.authenticated, login: session.login }),
}));
vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: session.activeWallet, walletAddress: session.activeWallet?.address.toLowerCase() }),
}));
vi.mock('@/components/header/WalletMenu', () => ({ WalletMenu: ({ address }: { address: string }) => <p>Wallet of {address}</p> }));
vi.mock('@/components/header/NavMenu', () => ({ NavMenu: () => null }));
vi.mock('@/components/header/LanguageSwitch', () => ({ LanguageSwitch: () => null }));

const { HeaderEnd } = await import('@/components/header/HeaderEnd');

beforeEach(() => {
  session.ready = true;
  session.authenticated = false;
  session.activeWallet = undefined;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HeaderEnd', () => {
  it('offers to sign in to a visitor', () => {
    render(<HeaderEnd />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(session.login).toHaveBeenCalled();
  });

  it('waits for Privy before it lets you sign in', () => {
    session.ready = false;
    render(<HeaderEnd />);

    expect(screen.getByRole('button', { name: 'Sign in' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows the wallet of a signed-in player', async () => {
    session.authenticated = true;
    session.activeWallet = { address: '0x4BFa1486661d6FAa5300923bd684F261AE4776a5', walletClientType: 'privy' };
    render(<HeaderEnd />);

    expect(await screen.findByText('Wallet of 0x4BFa1486661d6FAa5300923bd684F261AE4776a5')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });

  it('never offers Sign in to a player whose wallet is still loading', () => {
    session.authenticated = true;
    render(<HeaderEnd />);

    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });
});
