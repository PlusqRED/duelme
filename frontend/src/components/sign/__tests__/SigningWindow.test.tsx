// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAKING_LONG_MS } from '@/hooks/useTakingLong';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { flowError } from '@/lib/flowError';
import { exactly, joinModel, shortModel, t } from './helpers/signingModels';

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const HASH = `0x${'5d'.repeat(32)}` as const;

const gas = vi.hoisted(() => ({
  state: {
    eth: undefined as unknown,
    fix: null as 'faucet' | 'topUpEth' | null,
    isFaucetBusy: false,
    feeOf: () => null,
    claimFaucet: vi.fn(),
    retryEth: vi.fn(),
    isTopUpOpen: false,
    openTopUp: vi.fn(),
    closeTopUp: vi.fn(),
  },
}));

const wallet = vi.hoisted(() => ({ clientType: 'metamask' }));

vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: { address: ADDRESS, walletClientType: wallet.clientType }, walletAddress: ADDRESS.toLowerCase() }),
}));
vi.mock('@/hooks/useSignGas', () => ({ useSignGas: () => gas.state }));
vi.mock('@/hooks/useUsdtBalance', () => ({ useUsdtBalance: () => ({ read: null, refetch: vi.fn() }) }));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => ({ isRelayEnabled: true }) }));
vi.mock('@/hooks/useFaucetClaim', () => ({ useFaucetClaim: () => ({ offer: { kind: 'none' }, isClaiming: false, claim: vi.fn() }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { SigningWindow } = await import('@/components/sign/SigningWindow');

beforeEach(() => {
  wallet.clientType = 'metamask';
  gas.state.eth = undefined;
  gas.state.fix = null;
  gas.state.isFaucetBusy = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function dialog() {
  return screen.getByRole('dialog', { name: 'Join duel #3' });
}

describe('SigningWindow — Check', () => {
  it('testSigningWindowListsWhatThePlayerSigns', () => {
    render(<SigningWindow model={joinModel()} />);

    expect(screen.getByText('What you sign')).toBeTruthy();
    expect(screen.getByText('Allow 5\u00a0USDT for this duel', exactly)).toBeTruthy();
    expect(screen.getByText('Join duel #3 against Nova')).toBeTruthy();
    expect(screen.getByText('2 signatures')).toBeTruthy();
  });

  it('testSigningWindowStartsTheFlowFromItsMainButton', () => {
    const model = joinModel();
    render(<SigningWindow model={model} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign and join' }));

    expect(model.onContinue).toHaveBeenCalledOnce();
  });

  it('testSigningWindowCarriesThePressThroughTheWalletSteps', () => {
    const model = joinModel();
    const { rerender } = render(<SigningWindow model={model} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign and join' }));

    rerender(<SigningWindow model={{ ...model, place: 'write' }} />);

    expect(model.run.write).toHaveBeenCalledOnce();
  });

  it('testSigningWindowFoldsTheTechnicalDetailsAway', () => {
    render(<SigningWindow model={joinModel()} />);

    fireEvent.click(screen.getByText('Technical details'));

    expect(screen.getByText('joinDuelWithPermit')).toBeTruthy();
  });

  it('testSigningWindowOffersATopUpForAShortWallet', () => {
    const model = shortModel();
    render(<SigningWindow model={model} />);

    fireEvent.click(screen.getByRole('button', { name: 'Top up 3\u00a0USDT' }));

    expect(model.stake.funding.openTopUp).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Sign and join' })).toBeNull();
  });

  it('testSigningWindowOpensTheTopUpOverItselfAndEscClosesOnlyThat', async () => {
    const model = shortModel({ isTopUpOpen: true });
    render(<SigningWindow model={model} />);

    fireEvent.keyDown(await screen.findByRole('dialog', { name: 'Top up' }), { key: 'Escape' });

    expect(model.stake.funding.closeTopUp).toHaveBeenCalledOnce();
    expect(model.onClose).not.toHaveBeenCalled();
  });

  it('testSigningWindowOpensNoTopUpBeforeThereIsAWallet', () => {
    render(<SigningWindow model={shortModel({ balance: { kind: 'no-wallet' }, status: { kind: 'unknown' }, isTopUpOpen: true })} />);

    expect(screen.getByText('Wallet not ready. Please try again.')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Top up' })).toBeNull();
  });

  it('testSigningWindowSaysWhyADuelCanNoLongerBeJoined', () => {
    const model = { ...shortModel(), blockedReason: t('sign.join.unavailable') };
    render(<SigningWindow model={model} />);

    expect(screen.getByText(t('sign.join.unavailable'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Top up 3\u00a0USDT' })).toBeNull();
  });

  it('testSigningWindowReadsAFailedBalanceAgain', () => {
    const model = shortModel({ balance: { kind: 'error' }, status: { kind: 'unknown' } });
    render(<SigningWindow model={model} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Couldn’t read the balance.')).toBeTruthy();
    expect(model.stake.funding.retry).toHaveBeenCalledOnce();
  });

  it('testSigningWindowAsksTheFaucetForMissingTestEth', () => {
    gas.state.fix = 'faucet';
    render(<SigningWindow model={joinModel({}, 'self')} />);

    fireEvent.click(screen.getByRole('button', { name: t('wallet.faucet') }));

    expect(gas.state.claimFaucet).toHaveBeenCalledOnce();
  });

  it('testSigningWindowClosesFromNotNow', () => {
    const model = joinModel();
    render(<SigningWindow model={model} />);

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(model.onClose).toHaveBeenCalledOnce();
  });
});

describe('SigningWindow — the wallet and the network at work', () => {
  it('testSigningWindowAsksToSwitchNetworks', () => {
    render(<SigningWindow model={joinModel({ place: 'switch-network', actionState: 'awaiting-wallet', showNetwork: true })} />);

    expect(screen.getByText(`Switch to ${DEFAULT_CHAIN.name}`)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Waiting for your wallet…');
  });

  it('testSigningWindowCannotBeClosedWhileTheWalletWorks', () => {
    const model = joinModel({ place: 'write', actionState: 'awaiting-wallet', signing: { ...joinModel().signing, phase: 'permit' } });
    render(<SigningWindow model={model} />);

    const close = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(close);

    expect(close.getAttribute('aria-disabled')).toBe('true');
    expect(model.onClose).not.toHaveBeenCalled();
  });

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

  it('testSigningWindowAsksForThePressOnAStepNotStartedEvenWithTheWalletInTheApp', () => {
    wallet.clientType = 'privy';

    render(<SigningWindow model={joinModel({ place: 'write', actionState: 'idle' })} />);

    expect([screen.getByText('Sign in your wallet'), screen.queryByText('Signing')]).toEqual([expect.anything(), null]);
  });

  it('testSigningWindowSaysTheWalletInTheAppSignedOnceTheChainHasIt', () => {
    wallet.clientType = 'privy';

    render(<SigningWindow model={joinModel({ place: 'write', actionState: 'confirming', signing: { ...joinModel().signing, hash: HASH } })} />);

    expect(screen.getByText('Signed by your wallet')).toBeTruthy();
  });

  it('testSigningWindowCountsTheSignatures', () => {
    render(<SigningWindow model={joinModel({ place: 'write', actionState: 'awaiting-wallet', signing: { ...joinModel().signing, phase: 'request' } })} />);

    expect(screen.getByText('Signature 2 of 2')).toBeTruthy();
  });

  it('testSigningWindowTicksOffTheSendAndLinksTheTransaction', () => {
    render(<SigningWindow model={joinModel({ place: 'write', actionState: 'confirming', signing: { ...joinModel().signing, hash: HASH } })} />);

    expect(screen.getByText('Sent by DuelMe, fee paid')).toBeTruthy();
    const link = screen.getByRole('link', { name: /View on/ });
    expect(link.getAttribute('href')).toBe(`${DEFAULT_CHAIN.explorer}/tx/${HASH}`);
  });

  it('testSigningWindowOffersAWayOutWhenTheNetworkTakesLong', () => {
    vi.useFakeTimers();
    const model = joinModel({ place: 'write', actionState: 'confirming', signing: { ...joinModel().signing, hash: HASH } });
    render(<SigningWindow model={model} />);

    act(() => vi.advanceTimersByTime(TAKING_LONG_MS));
    fireEvent.click(screen.getByRole('button', { name: 'Close and check later' }));

    expect(model.onClose).toHaveBeenCalledOnce();
  });

  it('testSigningWindowOffersTheWayOutAtOnceOnAWaitAlreadyLeft', () => {
    const model = joinModel({ place: 'write', actionState: 'confirming', wasLeft: true, signing: { ...joinModel().signing, hash: HASH } });

    render(<SigningWindow model={model} />);

    expect(screen.getByRole('button', { name: 'Close and check later' })).toBeTruthy();
  });
});

describe('SigningWindow — how it went', () => {
  it('testSigningWindowSaysItIsDone', () => {
    const model = joinModel({ place: 'success' });
    render(<SigningWindow model={model} />);

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Back to the duel' }));

    expect(screen.getByText(t('sign.join.done.title'))).toBeTruthy();
    expect(model.onDone).toHaveBeenCalledOnce();
  });

  it('testSigningWindowSaysWhatTheWalletPaid', () => {
    render(<SigningWindow model={joinModel({ place: 'success', signing: { ...joinModel().signing, feePaidWei: 13_000_000_000_000n } }, 'self')} />);

    expect(screen.getByText('Network fee: 0.00001 ETH from your wallet')).toBeTruthy();
  });

  it('testSigningWindowRetriesARejectedSignature', () => {
    const model = joinModel({ place: 'write', actionState: 'error', error: flowError('rejected'), signing: { ...joinModel().signing, failedWhile: 'awaiting-wallet' } });
    render(<SigningWindow model={model} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Nothing was signed')).toBeTruthy();
    expect(model.run.write).toHaveBeenCalledOnce();
  });

  it('testSigningWindowOffersNoRetryAfterTheDaysLimit', () => {
    render(
      <SigningWindow
        model={joinModel({ place: 'write', actionState: 'error', error: flowError('budget', 'Daily gas allowance is used up.'), signing: { ...joinModel().signing, failedWhile: 'confirming' } })}
      />
    );

    expect(screen.getByText('Free sends for today are used up')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('testSigningWindowShowsTheRawErrorUnderItsDetails', () => {
    render(
      <SigningWindow
        model={joinModel({ place: 'write', actionState: 'error', error: flowError('error', 'HTTP request failed.'), signing: { ...joinModel().signing, failedWhile: 'confirming' } })}
      />
    );

    fireEvent.click(screen.getByText('Error details'));

    expect(screen.getByText('HTTP request failed.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('testSigningWindowSaysAKeptApproveStays', () => {
    render(
      <SigningWindow
        model={joinModel({ place: 'write', actionState: 'error', approved: true, error: flowError('rejected'), signing: { ...joinModel().signing, failedWhile: 'awaiting-wallet' } }, 'self')}
      />
    );

    expect(screen.getByText('Nothing was sent')).toBeTruthy();
    expect(screen.getByText('The permission for 5\u00a0USDT stays: next time it takes one transaction less.', exactly)).toBeTruthy();
  });
});
