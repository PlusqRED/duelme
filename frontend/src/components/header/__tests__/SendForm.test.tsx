// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendForm } from '@/components/header/SendForm';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import type { FaucetOffer } from '@/lib/faucetApi';
import type { FreeTransferStatus, SendDraft, Transfer } from '@/lib/sendUsdt';
import { formatTime } from '@/lib/utils';
import type { WriteRoute } from '@/lib/writeRoute';

const MINE = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const THEIRS = '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23';
const NETWORK: NetworkBalances = {
  chain: SUPPORTED_CHAINS.arbitrumSepolia,
  usdt: { kind: 'ready', raw: 46_700_000n },
  eth: { kind: 'ready', raw: 7_736_000_000_000_000n },
};
const NO_FAUCET: FaucetOffer = { kind: 'none' };
const NEXT_FREE_AT = Date.UTC(2026, 9, 27);
const NO_ETH: NetworkBalances = { ...NETWORK, eth: { kind: 'ready', raw: 0n } };

interface FormSetup {
  network?: NetworkBalances;
  faucetOffer?: FaucetOffer;
  route?: WriteRoute;
  free?: FreeTransferStatus;
}

afterEach(cleanup);

function Harness({ setup, onSubmit }: { setup: Required<FormSetup>; onSubmit: (transfer: Transfer) => void }) {
  const [draft, setDraft] = useState<SendDraft>({ to: '', amount: '' });
  return (
    <SendForm
      address={MINE}
      network={setup.network}
      faucetOffer={setup.faucetOffer}
      route={setup.route}
      freeTransfer={{ status: setup.free, nextAt: NEXT_FREE_AT }}
      draft={draft}
      onDraft={setDraft}
      onSubmit={onSubmit}
    />
  );
}

function renderForm({ network = NETWORK, faucetOffer = NO_FAUCET, route = 'self', free = 'off' }: FormSetup = {}) {
  const onSubmit = vi.fn();
  render(<Harness setup={{ network, faucetOffer, route, free }} onSubmit={onSubmit} />);
  return {
    onSubmit,
    to: screen.getByLabelText('To'),
    amount: screen.getByLabelText('Amount'),
    send: () => fireEvent.click(screen.getByRole('button', { name: 'Check the transfer' })),
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

  it('fills in the whole balance with All', () => {
    const { amount } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect((amount as HTMLInputElement).value).toBe('46.7');
  });

  it('hands the transfer on to be looked over once nothing is wrong', () => {
    const { to, amount, send, onSubmit } = renderForm();
    fireEvent.change(to, { target: { value: ` ${THEIRS} ` } });
    fireEvent.change(amount, { target: { value: '10' } });

    send();

    expect(onSubmit).toHaveBeenCalledWith({ to: THEIRS, raw: 10_000_000n, route: 'self' });
  });

  it('says DuelMe pays the fee of the transfer it relays, and asks no ETH for it', () => {
    const { to, amount, send, onSubmit } = renderForm({ network: NO_ETH, route: 'relay', free: 'available' });
    expect(screen.getByText('The network fee for this transfer is on DuelMe.')).toBeTruthy();
    fireEvent.change(to, { target: { value: THEIRS } });
    fireEvent.change(amount, { target: { value: '10' } });

    send();

    expect(onSubmit).toHaveBeenCalledWith({ to: THEIRS, raw: 10_000_000n, route: 'relay' });
  });

  it('says when DuelMe pays again for a wallet with no ETH whose transfer for today is used', () => {
    const { to, amount, send, onSubmit } = renderForm({ network: NO_ETH, route: 'self', free: 'used' });
    fireEvent.change(to, { target: { value: THEIRS } });
    fireEvent.change(amount, { target: { value: '10' } });

    send();

    const time = formatTime(NEXT_FREE_AT, 'en');
    expect(
      screen.getByText(
        `No ETH for the network fee on Arbitrum Sepolia. DuelMe pays the fee of one transfer a day, and today’s has gone out; the next one is on DuelMe from ${time}. To send now, add ETH with Top up.`
      )
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('stops a wallet with no ETH for the fee, and points at the faucet when it can help', () => {
    const offer: FaucetOffer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1_000_000_000_000_000n };
    const { to, amount, send, onSubmit } = renderForm({ network: NO_ETH, faucetOffer: offer });
    fireEvent.change(to, { target: { value: THEIRS } });
    fireEvent.change(amount, { target: { value: '10' } });

    send();

    expect(
      screen.getByText('No ETH for the network fee on Arbitrum Sepolia. Add some with Top up to send. The faucet gives 0.001 ETH once.')
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not point at a faucet that has no ETH left to give this wallet', () => {
    const offer: FaucetOffer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 0n };
    const { to, amount, send } = renderForm({ network: NO_ETH, faucetOffer: offer });
    fireEvent.change(to, { target: { value: THEIRS } });
    fireEvent.change(amount, { target: { value: '10' } });

    send();

    expect(screen.getByText('No ETH for the network fee on Arbitrum Sepolia. Add some with Top up to send.')).toBeTruthy();
  });
});
