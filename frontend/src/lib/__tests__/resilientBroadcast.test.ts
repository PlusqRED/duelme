import type { Abi } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { broadcastWithFallback } from '@/lib/resilientBroadcast';

const ACCOUNT = '0x0afbe1aae4301458ba762ccbb22ba6fc4775e3a5' as const;
const CONTRACT = '0xbd2266ab4b62e34fd5282608abeeed425f6d7f22' as const;

const ERC20_APPROVE_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

const DUEL_JOIN_ABI = [
  {
    type: 'function',
    name: 'joinDuel',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'duelId', type: 'uint256' },
      { name: 'inviteSecret', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;

const CLAIM_VICTORY_ABI = [
  {
    type: 'function',
    name: 'claimVictory',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'duelId', type: 'uint256' }],
    outputs: [],
  },
] as const;

interface TestOverrides {
  signedTx?: `0x${string}`;
  broadcastHash?: `0x${string}`;
  abi?: Abi;
  functionName?: string;
  args?: readonly unknown[];
  gas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  chainId?: number;
}

function makeArgs(overrides: TestOverrides = {}) {
  const signedTx =
    overrides.signedTx ??
    ('0x02f88d82a4b102018401c9e6a98302003e94bd2266ab4b62e34fd5282608abeeed425f6d7f22' as const);
  const broadcastHash =
    overrides.broadcastHash ??
    ('0xcd96707e59322b0e7966e0003a7c927226fd3c3f41199417d5e071abde846139' as const);
  const signTransaction = vi.fn().mockResolvedValue(signedTx);
  const sendRawTransaction = vi.fn().mockResolvedValue(broadcastHash);

  return {
    signTransaction,
    sendRawTransaction,
    signedTx,
    broadcastHash,
    args: {
      walletClient: { signTransaction } as never,
      publicClient: { sendRawTransaction } as never,
      account: ACCOUNT as `0x${string}`,
      chainId: overrides.chainId ?? 42161,
      to: CONTRACT as `0x${string}`,
      // Spreading the readonly tuple into a mutable array so the helper's
      // `Abi` parameter is satisfied at runtime (the const-assertion is only a
      // type-level hint and viem accepts plain arrays).
      abi: overrides.abi ?? ([...ERC20_APPROVE_ABI] as Abi),
      functionName: overrides.functionName ?? 'approve',
      args: overrides.args ?? [CONTRACT, 5_000_000n],
      gas: overrides.gas ?? 131_134n,
      maxFeePerGas: overrides.maxFeePerGas ?? 30_009_001n,
      maxPriorityFeePerGas: overrides.maxPriorityFeePerGas ?? 1n,
      nonce: overrides.nonce ?? 2,
    },
  };
}

describe('broadcastWithFallback', () => {
  it('signs via the wallet and broadcasts via the public client', async () => {
    const { args, signTransaction, sendRawTransaction, broadcastHash } = makeArgs();

    const hash = await broadcastWithFallback(args);

    expect(hash).toBe(broadcastHash);
    expect(signTransaction).toHaveBeenCalledTimes(1);
    expect(sendRawTransaction).toHaveBeenCalledTimes(1);
  });

  it('forwards explicit gas params to signTransaction so Privy never auto-populates', async () => {
    const { args, signTransaction } = makeArgs();

    await broadcastWithFallback(args);

    expect(signTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        account: ACCOUNT,
        to: CONTRACT,
        chainId: 42161,
        type: 'eip1559',
        gas: 131_134n,
        maxFeePerGas: 30_009_001n,
        maxPriorityFeePerGas: 1n,
        nonce: 2,
        value: 0n,
      })
    );
  });

  it('forwards the explicit nonce so Privy never re-derives a zero nonce', async () => {
    // Privy's prepareTransactionRequest path silently signs with nonce: 0 once
    // viem caches eth_fillTransaction=false. Passing nonce explicitly is the
    // documented workaround; this test pins that the helper actually forwards
    // it instead of dropping it.
    const { args, signTransaction } = makeArgs({ nonce: 42 });

    await broadcastWithFallback(args);

    expect(signTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: 42 })
    );
  });

  it('uses EIP-1559 transaction type regardless of input', async () => {
    const { args, signTransaction } = makeArgs();

    await broadcastWithFallback(args);

    expect(signTransaction.mock.calls[0][0].type).toBe('eip1559');
  });

  it('encodes approve(address,uint256) correctly', async () => {
    const { args, signTransaction } = makeArgs();

    await broadcastWithFallback(args);

    const callArgs = signTransaction.mock.calls[0][0];
    // approve selector + 32-byte spender + 32-byte amount = 4 + 64 = 68 bytes
    expect(callArgs.data).toMatch(/^0x095ea7b3/);
    expect(callArgs.data.length).toBe(2 + 8 + 64 * 2);
  });

  it('encodes joinDuel(uint256,bytes32) with a real invite secret', async () => {
    const inviteSecret = ('0x' + 'a'.repeat(64)) as `0x${string}`;
    const { args, signTransaction } = makeArgs({
      abi: [...DUEL_JOIN_ABI] as Abi,
      functionName: 'joinDuel',
      args: [123n, inviteSecret],
    });

    await broadcastWithFallback(args);

    const callArgs = signTransaction.mock.calls[0][0];
    // joinDuel(uint256,bytes32) selector
    expect(callArgs.data).toMatch(/^0x5f5a3350/);
    // duelId 123 → 0x7b padded to 32 bytes
    expect(callArgs.data).toContain('000000000000000000000000000000000000000000000000000000000000007b');
    // invite secret 0xaa...aa
    expect(callArgs.data).toContain('a'.repeat(64));
  });

  it('encodes claimVictory(uint256) with duelId zero (first duel)', async () => {
    const { args, signTransaction } = makeArgs({
      abi: [...CLAIM_VICTORY_ABI] as Abi,
      functionName: 'claimVictory',
      args: [0n],
    });

    await broadcastWithFallback(args);

    const callArgs = signTransaction.mock.calls[0][0];
    // claimVictory(uint256) selector + 32 zero bytes
    expect(callArgs.data).toBe(
      '0x4ff776b80000000000000000000000000000000000000000000000000000000000000000'
    );
  });

  it('passes the signed RLP from the wallet straight to sendRawTransaction', async () => {
    const signedTx = '0xdeadbeef' as const;
    const { args, sendRawTransaction } = makeArgs({ signedTx });

    await broadcastWithFallback(args);

    expect(sendRawTransaction).toHaveBeenCalledWith({ serializedTransaction: signedTx });
  });

  it('surfaces signing failures without attempting to broadcast', async () => {
    const { args, sendRawTransaction } = makeArgs();
    (args.walletClient as unknown as { signTransaction: ReturnType<typeof vi.fn> }).signTransaction =
      vi.fn().mockRejectedValue(new Error('user rejected'));

    await expect(broadcastWithFallback(args)).rejects.toThrow('user rejected');
    expect(sendRawTransaction).not.toHaveBeenCalled();
  });

  it('propagates broadcast failures from the public client', async () => {
    const { args } = makeArgs();
    (args.publicClient as unknown as { sendRawTransaction: ReturnType<typeof vi.fn> }).sendRawTransaction =
      vi.fn().mockRejectedValue(new Error('HTTP request failed'));

    await expect(broadcastWithFallback(args)).rejects.toThrow('HTTP request failed');
  });

  it('works for Arbitrum Sepolia (testnet) just like mainnet', async () => {
    // The Privy single-URL broadcast bug affects testnet too, so the helper
    // must accept testnet chainId without any special-casing.
    const { args, signTransaction } = makeArgs({ chainId: 421614 });

    await broadcastWithFallback(args);

    expect(signTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: 421614 })
    );
  });

  it('uses value: 0n — DuelMe and ERC20 ops are never payable', async () => {
    const { args, signTransaction } = makeArgs();

    await broadcastWithFallback(args);

    expect(signTransaction.mock.calls[0][0].value).toBe(0n);
  });

  it('signs before broadcasting (order is observable for retry/debug)', async () => {
    const callOrder: string[] = [];
    const { args, signTransaction, sendRawTransaction } = makeArgs();
    signTransaction.mockImplementation(async () => {
      callOrder.push('sign');
      return '0xabcd';
    });
    sendRawTransaction.mockImplementation(async () => {
      callOrder.push('broadcast');
      return '0xefgh';
    });

    await broadcastWithFallback(args);

    expect(callOrder).toEqual(['sign', 'broadcast']);
  });
});
