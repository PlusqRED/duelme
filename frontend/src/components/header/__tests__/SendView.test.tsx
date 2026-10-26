// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { SUPPORTED_CHAINS } from '@/lib/constants';

const MINE = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const THEIRS = '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23';
const NETWORK: NetworkBalances = {
  chain: SUPPORTED_CHAINS.arbitrumSepolia,
  usdt: { kind: 'ready', raw: 46_700_000n },
  eth: { kind: 'ready', raw: 7_736_000_000_000_000n },
};

const sending = vi.hoisted(() => ({ send: vi.fn(), reset: vi.fn(), route: 'self' as 'self' | 'relay' }));
vi.mock('@/hooks/useSendUsdt', () => ({
  useSendUsdt: () => ({
    send: sending.send,
    reset: sending.reset,
    route: sending.route,
    freeTransfer: { status: 'available', nextAt: 0 },
    hash: undefined,
    isConfirming: false,
    isSuccess: false,
    failure: null,
  }),
}));

const { SendView } = await import('@/components/header/SendView');

function fillAndGoOn() {
  render(<SendView address={MINE} network={NETWORK} faucetOffer={{ kind: 'none' }} isInAppWallet onBack={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('To'), { target: { value: THEIRS } });
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Check the transfer' }));
}

beforeEach(() => {
  sending.send.mockClear();
  sending.route = 'self';
});

afterEach(cleanup);

describe('SendView', () => {
  it('testSendViewShowsTheTransferBeforeAnythingIsSent', () => {
    fillAndGoOn();

    expect(screen.getByText(THEIRS)).toBeTruthy();
    expect(sending.send).not.toHaveBeenCalled();
  });

  it('testSendViewSendsTheTransferLookedOver', () => {
    fillAndGoOn();

    fireEvent.click(screen.getByRole('button', { name: 'Send 10 USDT' }));

    expect(sending.send).toHaveBeenCalledWith({ to: THEIRS, raw: 10_000_000n, route: 'self' });
    expect(screen.getByText('Your wallet is sending the transfer…')).toBeTruthy();
  });

  it('testSendViewSendsTheTransferTheWayTheFormSaidItWouldGo', () => {
    sending.route = 'relay';
    fillAndGoOn();

    fireEvent.click(screen.getByRole('button', { name: 'Send 10 USDT' }));

    expect(sending.send).toHaveBeenCalledWith({ to: THEIRS, raw: 10_000_000n, route: 'relay' });
    expect(screen.getByText('Your wallet is signing the transfer…')).toBeTruthy();
  });

  it('testSendViewGoesBackToTheFormAsFilledInToChangeIt', () => {
    fillAndGoOn();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));

    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe(THEIRS);
    expect(sending.send).not.toHaveBeenCalled();
  });
});
