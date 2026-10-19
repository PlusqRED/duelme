// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendProgress } from '@/components/header/SendProgress';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import type { SendStage } from '@/lib/sendUsdt';

const FROM = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const TRANSFER = { to: '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23', raw: 10_000_000n } as const;
const HASH = `0x${'ab'.repeat(32)}` as const;

afterEach(cleanup);

function renderProgress(stage: Exclude<SendStage, 'form'>, error: Error | null = null) {
  const onDone = vi.fn();
  const onRetry = vi.fn();
  render(
    <SendProgress
      stage={stage}
      from={FROM}
      transfer={TRANSFER}
      network={SUPPORTED_CHAINS.arbitrumSepolia}
      hash={stage === 'done' ? HASH : undefined}
      error={error}
      onDone={onDone}
      onRetry={onRetry}
    />
  );
  return { onDone, onRetry };
}

describe('SendProgress', () => {
  it('asks you to confirm in the wallet before there is a transaction', () => {
    renderProgress('confirm');

    expect(screen.getByText('Confirm the transfer in your wallet.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
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
    const { onRetry } = renderProgress('rejected', new Error('User rejected the request.'));

    expect(screen.getByText('Turned down in the wallet. Nothing was sent.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('says why a transfer failed', () => {
    renderProgress('failed', new Error('insufficient funds for gas'));

    expect(screen.getByText('The transfer didn’t go through.')).toBeTruthy();
    expect(screen.getByText('insufficient funds for gas')).toBeTruthy();
  });
});
