// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowBalance } from '@/components/topup/TopUpWindow';
import { DEFAULT_CHAIN, SUPPORTED_CHAINS } from '@/lib/constants';
import type { FaucetOffer } from '@/lib/faucetApi';

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const WALLET = ADDRESS.toLowerCase() as `0x${string}`;
const SEPOLIA = SUPPORTED_CHAINS.arbitrumSepolia;
const ONE = SUPPORTED_CHAINS.arbitrum;

const reads = vi.hoisted(() => ({
  ownBalance: { status: 'success', data: 46_700_000n } as { status: string; data?: bigint },
  useUsdtBalance: vi.fn(),
  offer: { kind: 'none' } as FaucetOffer,
  isRelayEnabled: true,
}));

vi.mock('@/hooks/useUsdtBalance', () => ({
  useUsdtBalance: (chainId: number, wallet: string, enabled: boolean) => {
    reads.useUsdtBalance(chainId, wallet, enabled);
    return {
      read: {
        key: { chainId, walletAddress: wallet },
        status: reads.ownBalance.status,
        data: reads.ownBalance.data,
        dataUpdatedAt: 1,
        isFetchedAfterMount: true,
        isPlaceholderData: false,
        isFetching: false,
      },
      refetch: vi.fn(),
    };
  },
}));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => ({ isRelayEnabled: reads.isRelayEnabled }) }));
vi.mock('@/hooks/useFaucetClaim', () => ({
  useFaucetClaim: () => ({ offer: reads.offer, isClaiming: false, claim: vi.fn(async () => true) }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { TopUpWindow } = await import('@/components/topup/TopUpWindow');

beforeEach(() => {
  reads.ownBalance = { status: 'success', data: 46_700_000n };
  reads.offer = { kind: 'none' };
  reads.isRelayEnabled = true;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderWindow(props: { chainId?: number | null; neededRaw?: bigint; isJoining?: boolean; flowBalance?: FlowBalance; onClose?: () => void } = {}) {
  const { chainId = SEPOLIA.id, onClose = vi.fn(), ...rest } = props;
  return render(<TopUpWindow address={ADDRESS} walletAddress={WALLET} chainId={chainId} onClose={onClose} {...rest} />);
}

describe('TopUpWindow', () => {
  it('shows the address to send to as a QR code and in groups of four', () => {
    renderWindow();

    expect(screen.getByRole('dialog', { name: 'Top up' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'QR code of your wallet address' })).toBeTruthy();
    expect(screen.getByText('0x 4BFa 1486 661d 6FAa 5300 923b d684 F261 AE47 76a5')).toBeTruthy();
  });

  it('says test money is test money on the test network', () => {
    renderWindow({ chainId: SEPOLIA.id });

    expect(screen.getByText('Arbitrum Sepolia, test network')).toBeTruthy();
    expect(screen.getByText('Send test USDT on Arbitrum Sepolia to this address.')).toBeTruthy();
    expect(screen.getByText('Test network: don’t send real USDT here.')).toBeTruthy();
  });

  it.runIf(DEFAULT_CHAIN.id !== ONE.id)('warns that duels do not run on a network other than theirs', () => {
    renderWindow({ chainId: ONE.id });

    expect(screen.getByText('Use exactly this token and network: a transfer on another network may be lost.')).toBeTruthy();
    expect(screen.getByText(`Duels on this site run on ${DEFAULT_CHAIN.name}: USDT here can’t go into a duel.`)).toBeTruthy();
    expect(screen.queryByText('No ETH needed for duels: DuelMe pays the network fee.')).toBeNull();
  });

  it('reads the balance there itself, and is done with a plain Done', () => {
    renderWindow();

    expect(reads.useUsdtBalance).toHaveBeenCalledWith(SEPOLIA.id, WALLET, true);
    expect(screen.getByText('46.7 USDT', { normalizer: (text) => text })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
    expect(screen.queryByText('Your duel settings stay as they are.')).toBeNull();
  });

  it('opened for a duel, shows the flow\'s own balance read, what is missing and the way back', () => {
    const flowBalance: FlowBalance = { balance: { kind: 'ready', raw: 46_700_000n }, retry: vi.fn() };
    renderWindow({ neededRaw: 50_000_000n, flowBalance });

    expect(reads.useUsdtBalance).toHaveBeenCalledWith(SEPOLIA.id, WALLET, false);
    expect(screen.getByText('Needed for this duel: 50 USDT')).toBeTruthy();
    expect(screen.getByText('3.3 USDT short')).toBeTruthy();
    expect(screen.getByText('Your duel settings stay as they are.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to the duel' })).toBeTruthy();
  });

  it('says a balance that covers the duel covers it', () => {
    renderWindow({ neededRaw: 40_000_000n });

    expect(screen.getByText('Enough for this duel')).toBeTruthy();
  });

  it('tells a player joining that topping up holds no seat', () => {
    renderWindow({ neededRaw: 50_000_000n, isJoining: true });

    expect(screen.getByText('Topping up doesn’t hold your place: someone else can still join first.')).toBeTruthy();
  });

  it('says duel actions take ETH when DuelMe does not pay their fee', () => {
    reads.isRelayEnabled = false;
    renderWindow({ chainId: DEFAULT_CHAIN.id });

    expect(screen.getByText(`Duel actions are paid in ETH from this wallet: keep a little on ${DEFAULT_CHAIN.name}.`)).toBeTruthy();
  });

  it('shows a balance it failed to read as failed, never as zero', () => {
    reads.ownBalance = { status: 'error' };
    renderWindow();

    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('Couldn’t read the balance.')).toBeTruthy();
  });

  it('offers the test faucet where it gives, and starts there', async () => {
    reads.offer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1_000_000_000_000_000n };
    renderWindow();

    const faucet = screen.getByRole('button', { name: 'Get test ETH and USDT' });
    await waitFor(() => expect(document.activeElement).toBe(faucet));
  });

  it('starts on the way back when there is no faucet to ask', async () => {
    renderWindow();

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Done' })));
  });

  it('closes from its button', () => {
    const onClose = vi.fn();
    renderWindow({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps its content while it closes', () => {
    const { rerender } = renderWindow();

    rerender(<TopUpWindow address={ADDRESS} walletAddress={WALLET} chainId={null} onClose={vi.fn()} />);

    expect(screen.getByText('Send test USDT on Arbitrum Sepolia to this address.')).toBeTruthy();
  });
});
