// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendForm } from '@/components/header/SendForm';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import type { FaucetOffer } from '@/lib/faucetApi';
import type { SendDraft, Transfer } from '@/lib/sendUsdt';

const MINE = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const THEIRS = '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23';
const NETWORK: NetworkBalances = {
  chain: SUPPORTED_CHAINS.arbitrumSepolia,
  usdt: { kind: 'ready', raw: 46_700_000n },
  eth: { kind: 'ready', raw: 7_736_000_000_000_000n },
};
const NO_FAUCET: FaucetOffer = { kind: 'none' };

afterEach(cleanup);

function Harness({ network, faucetOffer, onSubmit }: { network: NetworkBalances; faucetOffer: FaucetOffer; onSubmit: (transfer: Transfer) => void }) {
  const [draft, setDraft] = useState<SendDraft>({ to: '', amount: '' });
  return <SendForm address={MINE} network={network} faucetOffer={faucetOffer} draft={draft} onDraft={setDraft} onSubmit={onSubmit} />;
}

function renderForm(network = NETWORK, faucetOffer = NO_FAUCET) {
  const onSubmit = vi.fn();
  render(<Harness network={network} faucetOffer={faucetOffer} onSubmit={onSubmit} />);
  return {
    onSubmit,
    to: screen.getByLabelText('To'),
    amount: screen.getByLabelText('Amount'),
    send: () => fireEvent.click(screen.getByRole('button', { name: /^Send/ })),
  };
}

describe('SendForm', () => {
  it('says nothing is wrong before the first try to send', () => {
    renderForm();

    expect(screen.queryByText(/isn’t an address/)).toBeNull();
  });

  it('names every problem on the first try, and puts the focus on the first', () => {
    const { to, send, onSubmit } = renderForm();

    send();

    expect(screen.getByText('That isn’t an address: it starts with 0x and has 40 more characters.')).toBeTruthy();
    expect(screen.getByText('Enter how much to send.')).toBeTruthy();
    expect(to.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(to);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('stops a transfer to your own address and one larger than the balance', () => {
    const { to, amount, send } = renderForm();
    fireEvent.change(to, { target: { value: MINE.toLowerCase() } });
    fireEvent.change(amount, { target: { value: '50' } });

    send();

    expect(screen.getByText('That’s your own address.')).toBeTruthy();
    expect(screen.getByText('That’s more than you have: 46.7 USDT.')).toBeTruthy();
  });

  it('names the amount on the button as it is typed', () => {
    const { amount } = renderForm();

    fireEvent.change(amount, { target: { value: '12,5' } });

    expect(screen.getByRole('button', { name: 'Send 12.5\u00a0USDT' })).toBeTruthy();
  });

  it('fills in the whole balance with All', () => {
    const { amount } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect((amount as HTMLInputElement).value).toBe('46.7');
  });

  it('sends the transfer once nothing is wrong', () => {
    const { to, amount, send, onSubmit } = renderForm();
    fireEvent.change(to, { target: { value: ` ${THEIRS} ` } });
    fireEvent.change(amount, { target: { value: '10' } });

    send();

    expect(onSubmit).toHaveBeenCalledWith({ to: THEIRS, raw: 10_000_000n });
  });

  it('stops a wallet with no ETH for the fee, and points at the faucet when it can help', () => {
    const offer: FaucetOffer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1_000_000_000_000_000n };
    const { to, amount, send, onSubmit } = renderForm({ ...NETWORK, eth: { kind: 'ready', raw: 0n } }, offer);
    fireEvent.change(to, { target: { value: THEIRS } });
    fireEvent.change(amount, { target: { value: '10' } });

    send();

    expect(screen.getByText('No ETH for the network fee on Arbitrum Sepolia. The faucet gives 0.001 ETH once.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
