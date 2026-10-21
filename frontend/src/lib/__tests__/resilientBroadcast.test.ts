import { HttpRequestError, keccak256, RpcRequestError, toHex, type Abi } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  const signTransaction = vi.fn().mockResolvedValue({ signature: signedTx });
  const sendRawTransaction = vi.fn().mockResolvedValue(broadcastHash);
  const getTransaction = vi.fn().mockRejectedValue(new Error('Transaction not found'));

  return {
    signTransaction,
    sendRawTransaction,
    getTransaction,
    signedTx,
    broadcastHash,
    args: {
      signTransaction,
      publicClient: { sendRawTransaction, getTransaction } as never,
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
  it('signs in the wallet and broadcasts via the public client', async () => {
    const { args, signTransaction, sendRawTransaction, broadcastHash } = makeArgs();

    const hash = await broadcastWithFallback(args);

    expect(hash).toBe(broadcastHash);
    expect(signTransaction).toHaveBeenCalledTimes(1);
    expect(sendRawTransaction).toHaveBeenCalledTimes(1);
  });

  it('signs as the write\'s account with explicit gas params, so Privy never auto-populates', async () => {
    const { args, signTransaction } = makeArgs();

    await broadcastWithFallback(args);

    expect(signTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        from: ACCOUNT,
        to: CONTRACT,
        chainId: 42161,
        gasLimit: toHex(131_134n),
        maxFeePerGas: toHex(30_009_001n),
        maxPriorityFeePerGas: '0x1',
        nonce: '0x2',
      }),
      { address: ACCOUNT }
    );
  });

  // Privy's populate path signs with nonce 0, and its in-browser signer reads a numeric 0 as no
  // nonce at all, so the nonce goes in, as hex, every time.
  it.each([
    [42, '0x2a'],
    [0, '0x0'],
  ])('forwards nonce %i as %s', async (nonce, hex) => {
    const { args, signTransaction } = makeArgs({ nonce });

    await broadcastWithFallback(args);

    expect(signTransaction.mock.calls[0][0].nonce).toBe(hex);
  });

  it('gives Privy the EIP-1559 type as a number, since its wallet API refuses viem\'s "0x2"', async () => {
    const { args, signTransaction } = makeArgs();

    await broadcastWithFallback(args);

    expect(signTransaction.mock.calls[0][0].type).toBe(2);
  });

  it('gives the limit as gasLimit alone, since Privy sends a gas field as the gas price too', async () => {
    const { args, signTransaction } = makeArgs();

    await broadcastWithFallback(args);

    const transaction = signTransaction.mock.calls[0][0];
    expect(transaction).not.toHaveProperty('gas');
    expect(transaction).not.toHaveProperty('gasPrice');
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
    const { args, signTransaction, sendRawTransaction } = makeArgs();
    signTransaction.mockRejectedValue(new Error('user rejected'));

    await expect(broadcastWithFallback(args)).rejects.toThrow('user rejected');
    expect(sendRawTransaction).not.toHaveBeenCalled();
  });

  it('works for Arbitrum Sepolia (testnet) just like mainnet', async () => {
    // The Privy single-URL broadcast bug affects testnet too, so the helper
    // must accept testnet chainId without any special-casing.
    const { args, signTransaction } = makeArgs({ chainId: 421614 });

    await broadcastWithFallback(args);

    expect(signTransaction.mock.calls[0][0].chainId).toBe(421614);
  });

  it('sends no value — DuelMe and ERC20 ops are never payable', async () => {
    const { args, signTransaction } = makeArgs();

    await broadcastWithFallback(args);

    expect(signTransaction.mock.calls[0][0].value).toBe('0x0');
  });

  it('signs before broadcasting (order is observable for retry/debug)', async () => {
    const callOrder: string[] = [];
    const { args, signTransaction, sendRawTransaction } = makeArgs();
    signTransaction.mockImplementation(async () => {
      callOrder.push('sign');
      return { signature: '0xabcd' };
    });
    sendRawTransaction.mockImplementation(async () => {
      callOrder.push('broadcast');
      return '0xefgh';
    });

    await broadcastWithFallback(args);

    expect(callOrder).toEqual(['sign', 'broadcast']);
  });

  it('returns the transaction\'s hash when the broadcast failed but the network has it', async () => {
    const { args, sendRawTransaction, getTransaction, signedTx } = makeArgs();
    sendRawTransaction.mockRejectedValue(nodeError('nonce too low: next nonce 3, tx nonce 2'));
    getTransaction.mockResolvedValue({ hash: keccak256(signedTx) });

    await expect(broadcastWithFallback(args)).resolves.toBe(keccak256(signedTx));
  });

  it('reports the broadcast error when the network never shows the transaction', async () => {
    vi.useFakeTimers();
    const broadcastError = new HttpRequestError({ url: 'https://rpc.example', details: 'The request timed out.' });
    const { args, sendRawTransaction, getTransaction } = makeArgs();
    sendRawTransaction.mockRejectedValue(broadcastError);

    const sent = expect(broadcastWithFallback(args)).rejects.toBe(broadcastError);
    await vi.runAllTimersAsync();

    await sent;
    expect(getTransaction).toHaveBeenCalledTimes(3);
  });

  it('reports a node\'s refusal of the transaction itself at once, without looking for it', async () => {
    const refusal = nodeError('insufficient funds for gas * price + value');
    const { args, sendRawTransaction, getTransaction } = makeArgs();
    sendRawTransaction.mockRejectedValue(refusal);

    await expect(broadcastWithFallback(args)).rejects.toBe(refusal);
    expect(getTransaction).not.toHaveBeenCalled();
  });
});

function nodeError(message: string) {
  return new RpcRequestError({ body: {}, url: 'https://rpc.example', error: { code: -32000, message } });
}

afterEach(() => {
  vi.useRealTimers();
});
