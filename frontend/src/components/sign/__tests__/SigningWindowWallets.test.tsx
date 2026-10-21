// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { joinModel } from './helpers/signingModels';

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const HASH = `0x${'5d'.repeat(32)}` as const;

const wallet = vi.hoisted(() => ({ clientType: 'metamask' }));

vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: { address: ADDRESS, walletClientType: wallet.clientType }, walletAddress: ADDRESS.toLowerCase() }),
}));
vi.mock('@/hooks/useSignGas', () => ({
  useSignGas: () => ({ eth: undefined, fix: null, isFaucetBusy: false, feeOf: () => null, isTopUpOpen: false }),
}));
vi.mock('@/hooks/useUsdtBalance', () => ({ useUsdtBalance: () => ({ read: null, refetch: vi.fn() }) }));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => ({ isRelayEnabled: true }) }));
vi.mock('@/hooks/useFaucetClaim', () => ({ useFaucetClaim: () => ({ offer: { kind: 'none' }, isClaiming: false, claim: vi.fn() }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { SigningWindow } = await import('@/components/sign/SigningWindow');

beforeEach(() => {
  wallet.clientType = 'metamask';
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** The wallet in the app signs without a prompt of its own, so the window is its confirmation; an outside wallet prompts. */
describe('SigningWindow — the wallet in the app and an outside one', () => {
  it('testSigningWindowSaysBeforeThePressThatTheWalletInTheAppSignsAtOnce', () => {
    wallet.clientType = 'privy';

    render(<SigningWindow model={joinModel()} />);

    expect(screen.getByText('Your wallet signs as soon as you press: no wallet window of its own will open.')).toBeTruthy();
  });

  it('testSigningWindowLeavesTheWarningOutForAnOutsideWalletWhichPromptsItself', () => {
    render(<SigningWindow model={joinModel()} />);

    expect(screen.queryByText(/no wallet window of its own/)).toBeNull();
  });

  it('testSigningWindowAsksForTheSignatureInAnOutsideWallet', () => {
    render(<SigningWindow model={joinModel({ place: 'write', actionState: 'awaiting-wallet', signing: { ...joinModel().signing, phase: 'permit' } })} />);

    expect([screen.getByText('Sign in your wallet'), screen.getByText('Waiting for your signature…')]).toHaveLength(2);
  });

  it('testSigningWindowAsksNothingOfTheWalletInTheAppWhichSignsAtOnce', () => {
    wallet.clientType = 'privy';

    render(<SigningWindow model={joinModel({ place: 'write', actionState: 'awaiting-wallet', signing: { ...joinModel().signing, phase: 'permit' } })} />);

    expect([screen.queryByText('Sign in your wallet'), screen.getByText('Your wallet is signing…')]).toEqual([null, expect.anything()]);
  });

  it('testSigningWindowAsksForThePressOnAStepNotStartedInAnOutsideWallet', () => {
    render(<SigningWindow model={joinModel({ place: 'write', actionState: 'idle' })} />);

    expect([screen.getByText('Sign in your wallet'), screen.queryByText(/no wallet window of its own/)]).toEqual([expect.anything(), null]);
  });

  it('testSigningWindowSaysTheStepNotStartedSignsAtThePressWithTheWalletInTheApp', () => {
    wallet.clientType = 'privy';

    render(<SigningWindow model={joinModel({ place: 'write', actionState: 'idle' })} />);

    expect([
      screen.queryByText('Sign in your wallet'),
      screen.queryByText('Signing'),
      screen.getByText('Ready to sign'),
      screen.getByText('Your wallet signs as soon as you press: no wallet window of its own will open.'),
    ]).toEqual([null, null, expect.anything(), expect.anything()]);
  });

  it('testSigningWindowSaysTheWalletInTheAppSignedOnceTheChainHasIt', () => {
    wallet.clientType = 'privy';

    render(<SigningWindow model={joinModel({ place: 'write', actionState: 'confirming', signing: { ...joinModel().signing, hash: HASH } })} />);

    expect(screen.getByText('Signed by your wallet')).toBeTruthy();
  });
});
