import { describe, expect, it } from 'vitest';
import {
  type BalanceRead,
  getDepositCopyKeys,
  hasEnoughFreshBalance,
  resolveBalanceStatus,
  resolveFunding,
  summarizeChainBalances,
} from '../deposit';

const WALLET = '0x1111111111111111111111111111111111111111';
const OTHER_WALLET = '0x2222222222222222222222222222222222222222';
const CHAIN = 421614;
const OPENED_AT = 1_000;

function read(overrides: Partial<BalanceRead> = {}): BalanceRead {
  return {
    key: { chainId: CHAIN, walletAddress: WALLET },
    status: 'success',
    data: 5_000_000n,
    dataUpdatedAt: OPENED_AT + 1,
    isFetchedAfterMount: true,
    isPlaceholderData: false,
    isFetching: false,
    ...overrides,
  };
}

const EXPECTED = { chainId: CHAIN, walletAddress: WALLET };

describe('resolveBalanceStatus', () => {
  it('is ready for a successful answer for the same key fetched after the flow opened', () => {
    expect(resolveBalanceStatus(read(), EXPECTED, OPENED_AT)).toEqual({ kind: 'ready', raw: 5_000_000n });
  });

  it('treats a zero balance as an amount, not as missing', () => {
    expect(resolveBalanceStatus(read({ data: 0n }), EXPECTED, OPENED_AT)).toEqual({ kind: 'ready', raw: 0n });
  });

  it('matches the wallet address case-insensitively', () => {
    const checksummed = { chainId: CHAIN, walletAddress: WALLET.toUpperCase().replace('0X', '0x') };

    expect(resolveBalanceStatus(read(), checksummed, OPENED_AT).kind).toBe('ready');
  });

  it('has no balance to show without a wallet', () => {
    expect(resolveBalanceStatus(read(), null, OPENED_AT)).toEqual({ kind: 'no-wallet' });
  });

  it('is checking before any read exists', () => {
    expect(resolveBalanceStatus(null, EXPECTED, OPENED_AT)).toEqual({ kind: 'checking' });
  });

  it('is checking while the first read is pending', () => {
    expect(resolveBalanceStatus(read({ status: 'pending', data: undefined }), EXPECTED, OPENED_AT)).toEqual({ kind: 'checking' });
  });

  it('ignores an answer for another wallet', () => {
    const foreign = read({ key: { chainId: CHAIN, walletAddress: OTHER_WALLET } });

    expect(resolveBalanceStatus(foreign, EXPECTED, OPENED_AT)).toEqual({ kind: 'checking' });
  });

  it('ignores an answer for another chain', () => {
    const foreign = read({ key: { chainId: 42161, walletAddress: WALLET } });

    expect(resolveBalanceStatus(foreign, EXPECTED, OPENED_AT)).toEqual({ kind: 'checking' });
  });

  it('ignores placeholder data carried over from a previous key', () => {
    expect(resolveBalanceStatus(read({ isPlaceholderData: true }), EXPECTED, OPENED_AT)).toEqual({ kind: 'checking' });
  });

  it('ignores a cached answer not refetched since the observer mounted or the wallet changed', () => {
    expect(resolveBalanceStatus(read({ isFetchedAfterMount: false }), EXPECTED, OPENED_AT)).toEqual({ kind: 'checking' });
  });

  it('ignores an answer older than the moment the flow opened', () => {
    expect(resolveBalanceStatus(read({ dataUpdatedAt: OPENED_AT - 1 }), EXPECTED, OPENED_AT)).toEqual({ kind: 'checking' });
  });

  it('is an error when the read failed', () => {
    expect(resolveBalanceStatus(read({ status: 'error', data: undefined }), EXPECTED, OPENED_AT)).toEqual({ kind: 'error' });
  });

  it('is an error when a refetch failed after an earlier success, despite the cached amount', () => {
    expect(resolveBalanceStatus(read({ status: 'error', data: 9_000_000n }), EXPECTED, OPENED_AT)).toEqual({ kind: 'error' });
  });

  it('is checking while a retry after an error is in flight', () => {
    expect(resolveBalanceStatus(read({ status: 'error', isFetching: true }), EXPECTED, OPENED_AT)).toEqual({ kind: 'checking' });
  });
});

describe('resolveFunding / hasEnoughFreshBalance', () => {
  it('is enough when the fresh balance covers the wager exactly', () => {
    const balance = { kind: 'ready', raw: 5_000_000n } as const;

    expect(resolveFunding(balance, 5_000_000n)).toEqual({ kind: 'enough' });
    expect(hasEnoughFreshBalance(balance, 5_000_000n)).toBe(true);
  });

  it('reports the shortfall when the balance is below the wager', () => {
    const balance = { kind: 'ready', raw: 1_500_000n } as const;

    expect(resolveFunding(balance, 5_000_000n)).toEqual({ kind: 'short', shortfallRaw: 3_500_000n });
    expect(hasEnoughFreshBalance(balance, 5_000_000n)).toBe(false);
  });

  it.each([
    { kind: 'checking' } as const,
    { kind: 'error' } as const,
    { kind: 'no-wallet' } as const,
  ])('is unknown, never enough, while the balance is $kind', (balance) => {
    expect(resolveFunding(balance, 0n)).toEqual({ kind: 'unknown' });
    expect(hasEnoughFreshBalance(balance, 0n)).toBe(false);
  });

  it('never lets a stale answer through, however large', () => {
    const stale = resolveBalanceStatus(read({ data: 10n ** 18n, dataUpdatedAt: 0 }), EXPECTED, OPENED_AT);

    expect(hasEnoughFreshBalance(stale, 1n)).toBe(false);
  });
});

describe('getDepositCopyKeys', () => {
  const MAINNET_INSTRUCTIONS = ['deposit.mainnet.send', 'deposit.mainnet.exact', 'deposit.mainnet.otherNetwork'];
  const TESTNET_INSTRUCTIONS = ['deposit.testnet.warning'];

  it.each([
    { testnet: false, isRelayEnabled: true, token: 'deposit.token.mainnet', instructions: MAINNET_INSTRUCTIONS, fees: 'deposit.fees.relayed' },
    { testnet: false, isRelayEnabled: false, token: 'deposit.token.mainnet', instructions: MAINNET_INSTRUCTIONS, fees: 'deposit.fees.selfPaid' },
    { testnet: true, isRelayEnabled: true, token: 'deposit.token.testnet', instructions: TESTNET_INSTRUCTIONS, fees: 'deposit.fees.relayed' },
    { testnet: true, isRelayEnabled: false, token: 'deposit.token.testnet', instructions: TESTNET_INSTRUCTIONS, fees: 'deposit.fees.selfPaid' },
  ])('testnet: $testnet, relay: $isRelayEnabled → $fees', ({ testnet, isRelayEnabled, token, instructions, fees }) => {
    expect(getDepositCopyKeys({ testnet, isRelayResolved: true, isRelayEnabled })).toEqual({ token, instructions, fees });
  });

  it.each([false, true])('says nothing about fees until the relayer probe has answered (testnet: %s)', (testnet) => {
    expect(getDepositCopyKeys({ testnet, isRelayResolved: false, isRelayEnabled: false }).fees).toBeNull();
  });
});

describe('summarizeChainBalances', () => {
  const CHAINS = [421614, 42161] as const;

  it('totals the chains once every one has answered', () => {
    const results = [
      { status: 'success', result: 2_000_000n },
      { status: 'success', result: 0n },
    ] as const;

    expect(summarizeChainBalances(CHAINS, results, false)).toEqual({
      balances: [
        { chainId: 421614, kind: 'ready', raw: 2_000_000n },
        { chainId: 42161, kind: 'ready', raw: 0n },
      ],
      totalRaw: 2_000_000n,
    });
  });

  it('keeps loading chains as checking and leaves the total unknown', () => {
    const summary = summarizeChainBalances(CHAINS, undefined, false);

    expect(summary.balances.map((balance) => balance.kind)).toEqual(['checking', 'checking']);
    expect(summary.totalRaw).toBeNull();
  });

  it('does not count a failed chain as zero', () => {
    const results = [
      { status: 'success', result: 2_000_000n },
      { status: 'failure' },
    ] as const;
    const summary = summarizeChainBalances(CHAINS, results, false);

    expect(summary.balances[1]).toEqual({ chainId: 42161, kind: 'error' });
    expect(summary.totalRaw).toBeNull();
  });

  it('marks every chain failed when the whole read failed, even with old results cached', () => {
    const results = [
      { status: 'success', result: 2_000_000n },
      { status: 'success', result: 1n },
    ] as const;
    const summary = summarizeChainBalances(CHAINS, results, true);

    expect(summary.balances.map((balance) => balance.kind)).toEqual(['error', 'error']);
    expect(summary.totalRaw).toBeNull();
  });
});
