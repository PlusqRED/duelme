// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendProgress } from '@/components/header/SendProgress';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import type { FaucetOffer } from '@/lib/faucetApi';
import type { SendError } from '@/lib/sendError';
import type { SendStage, Transfer } from '@/lib/sendUsdt';
import { formatTime } from '@/lib/utils';

const FROM = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const TRANSFER: Transfer = { to: '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23', raw: 10_000_000n, route: 'self' };
const RELAYED: Transfer = { ...TRANSFER, route: 'relay' };
const HASH = `0x${'ab'.repeat(32)}` as const;
const NEXT_FREE_AT = Date.UTC(2026, 9, 27);
const FAUCET: FaucetOffer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1_000_000_000_000_000n };

afterEach(cleanup);

interface ProgressSetup {
  transfer?: Transfer;
  failure?: SendError | null;
  isInAppWallet?: boolean;
  faucetOffer?: FaucetOffer;
}

function renderProgress(stage: SendStage, { transfer = TRANSFER, failure = null, isInAppWallet = false, faucetOffer = { kind: 'none' } }: ProgressSetup = {}) {
  const onDone = vi.fn();
  const onRetry = vi.fn();
  render(
    <SendProgress
      stage={stage}
      from={FROM}
      transfer={transfer}
      network={SUPPORTED_CHAINS.arbitrumSepolia}
      hash={stage === 'done' ? HASH : undefined}
      failure={failure}
      nextFreeAt={NEXT_FREE_AT}
      faucetOffer={faucetOffer}
      isInAppWallet={isInAppWallet}
      onDone={onDone}
      onRetry={onRetry}
    />
  );
  return { onDone, onRetry };
}

function failed(kind: SendError['kind'], detail: string | null = null, canRetry = true): SendError {
  return { kind, detail, canRetry };
}

describe('SendProgress', () => {
  it('asks you to confirm in the wallet before there is a transaction', () => {
    renderProgress('confirm');

    expect(screen.getByText('Confirm the transfer in your wallet.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('asks nothing of the wallet in the app, which sends without a prompt', () => {
    renderProgress('confirm', { isInAppWallet: true });

    expect(screen.getByText('Your wallet is sending the transfer…')).toBeTruthy();
  });

  it('asks for a signature, not a transaction, when DuelMe sends the transfer', () => {
    renderProgress('confirm', { transfer: RELAYED });
    expect(screen.getByText('Sign the transfer in your wallet.')).toBeTruthy();
    cleanup();

    renderProgress('confirm', { transfer: RELAYED, isInAppWallet: true });
    expect(screen.getByText('Your wallet is signing the transfer…')).toBeTruthy();
  });

  it('says the transfer is on its network', () => {
    renderProgress('sending');

    expect(screen.getByText('Sending on Arbitrum Sepolia…')).toBeTruthy();
  });

  it('says what went where once it is through, links the transaction, and leads back', () => {
    const { onDone } = renderProgress('done');

    expect(screen.getByText('Sent 10 USDT to 0x32a3...AA23')).toBeTruthy();
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(`https://sepolia.arbiscan.io/tx/${HASH}`);
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('says nothing was sent when the wallet turned it down, and offers to try again', () => {
    const { onRetry } = renderProgress('failed', { failure: failed('rejected') });

    expect(screen.getByText('Nothing was sent')).toBeTruthy();
    expect(screen.getByText(/You turned the request down in your wallet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('says what to do about a failure, and folds the raw error away', () => {
    renderProgress('failed', { failure: failed('eth', 'insufficient funds for gas') });

    expect(screen.getByText('Not enough ETH for the fee')).toBeTruthy();
    expect(screen.getByText(/Add ETH with Top up and try again\./)).toBeTruthy();
    expect(screen.getByText('Error details')).toBeTruthy();
    expect(screen.getByText('insufficient funds for gas')).toBeTruthy();
  });

  it('says when the next transfer on DuelMe opens once today\'s is used, and points at the faucet', () => {
    renderProgress('failed', { transfer: RELAYED, failure: failed('used'), faucetOffer: FAUCET });

    expect(screen.getByText('Today’s transfer on DuelMe has gone out')).toBeTruthy();
    expect(screen.getByText(new RegExp(`The next one is on DuelMe from ${formatTime(NEXT_FREE_AT, 'en')}\\.`))).toBeTruthy();
    expect(screen.getByText(/add ETH on Arbitrum Sepolia with Top up.*The faucet gives 0\.001 ETH once\./)).toBeTruthy();
  });

  it('does not point at the faucet for a failure ETH cannot fix', () => {
    renderProgress('failed', { failure: failed('balance'), faucetOffer: FAUCET });

    expect(screen.getByText('Not enough USDT')).toBeTruthy();
    expect(screen.queryByText(/faucet/)).toBeNull();
  });

  it('leads back to the wallet, not to a second try, when the transfer may have gone through', () => {
    const { onDone, onRetry } = renderProgress('failed', { transfer: RELAYED, failure: failed('lost', null, false) });

    expect(screen.getByText('No answer came back')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the wallet' }));
    expect(onDone).toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
  });
});
