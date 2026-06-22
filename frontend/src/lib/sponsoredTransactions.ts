import { createSmartAccountClient } from 'permissionless';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { entryPoint08Address } from 'viem/account-abstraction';
import type { SignAuthorizationReturnType } from 'viem/accounts';
import {
  encodeFunctionData,
  http,
  type Abi,
  type Account,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';
import {
  getSponsoredTransactionConfig,
  isSponsoredWriteAllowed,
  SPONSORSHIP_UNAVAILABLE_CODE,
} from '@/lib/sponsoredTransactionConfig';

export class SponsorshipUnavailableError extends Error {
  readonly code = SPONSORSHIP_UNAVAILABLE_CODE;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SponsorshipUnavailableError';
  }
}

// viem's canonical Simple7702Account (EntryPoint v0.8) implementation. The EOA
// delegates to this contract via the EIP-7702 authorization, which is what lets
// `toSimpleSmartAccount` send user operations from the EOA's own address. It is
// deployed at the same deterministic address on every supported chain (Arbitrum
// One + Sepolia), and must match the implementation toSimpleSmartAccount expects.
const SIMPLE_7702_IMPLEMENTATION =
  '0xe6Cae83BdE06E4c305530e199D7217f42808555B' as const;

/**
 * Signs an EIP-7702 authorization with the active wallet. Sourced from Privy's
 * `useSignAuthorization` hook in the caller — embedded wallets cannot sign
 * authorizations through the standard viem walletClient path.
 */
export type SignAuthorizationFn = (params: {
  contractAddress: `0x${string}`;
  chainId: number;
  nonce: number;
}) => Promise<SignAuthorizationReturnType>;

export interface SponsoredContractWriteArgs {
  /** Owner/signer for the EOA — the Privy embedded wallet routed through wagmi. */
  walletClient: WalletClient<Transport, Chain | undefined, Account>;
  /** Chain-scoped public client for nonce reads and account construction. */
  publicClient: PublicClient;
  /** Privy `useSignAuthorization` callback — signs the EIP-7702 delegation. */
  signAuthorization: SignAuthorizationFn;
  chainId: number;
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  /** Fired once the user op is broadcasting (delegation signed, awaiting chain). */
  onSubmitted?: () => void;
}

export async function sendSponsoredContractWrite({
  walletClient,
  publicClient,
  signAuthorization,
  chainId,
  address,
  abi,
  functionName,
  args,
  onSubmitted,
}: SponsoredContractWriteArgs): Promise<Hex> {
  const config = getSponsoredTransactionConfig(chainId);

  if (!config) {
    throw new SponsorshipUnavailableError(
      'Network fee sponsorship is not configured for this network.'
    );
  }

  if (!isSponsoredWriteAllowed(chainId, address, functionName)) {
    throw new SponsorshipUnavailableError(
      'Network fee sponsorship is not allowed for this action.'
    );
  }

  const ownerAddress = walletClient.account?.address;

  if (!ownerAddress) {
    throw new SponsorshipUnavailableError(
      'Embedded wallet signer is not ready — please retry.'
    );
  }

  const pimlicoClient = createPimlicoClient({
    transport: http(config.bundlerUrl),
  });

  // `address: ownerAddress` + `factory: '0x7702'` at send time keeps the smart
  // account address equal to the EOA, so msg.sender (and DuelMe reputation /
  // balances keyed to it) stays the user's own address.
  const account = await toSimpleSmartAccount({
    owner: walletClient,
    entryPoint: { address: entryPoint08Address, version: '0.8' },
    client: publicClient,
    address: ownerAddress,
  });

  const smartAccountClient = createSmartAccountClient({
    account,
    chain: config.chain,
    bundlerTransport: http(config.bundlerUrl),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () =>
        (await pimlicoClient.getUserOperationGasPrice()).fast,
    },
  });

  const data = encodeFunctionData({ abi, functionName, args });

  try {
    // Privy embedded wallets can't sign EIP-7702 authorizations through the
    // standard walletClient, so we sign explicitly via Privy's hook and pass it
    // with `factory: '0x7702'` below. Re-delegating to the same implementation
    // on each send is idempotent; duel actions run awaited-sequentially, so the
    // authorization nonce (the EOA's current nonce) is always up to date.
    const nonce = await publicClient.getTransactionCount({
      address: ownerAddress,
    });

    const authorization = await signAuthorization({
      contractAddress: SIMPLE_7702_IMPLEMENTATION,
      chainId,
      nonce,
    });

    // User has signed the delegation; the bundler now broadcasts and mines it.
    onSubmitted?.();

    return await smartAccountClient.sendTransaction({
      calls: [{ to: address, data, value: 0n }],
      factory: '0x7702',
      factoryData: '0x',
      paymasterContext: { sponsorshipPolicyId: config.sponsorshipPolicyId },
      authorization,
    });
  } catch (error) {
    if (isUserRejection(error)) {
      throw error;
    }

    if (error instanceof SponsorshipUnavailableError) {
      throw error;
    }

    // The UI only surfaces a generic "sponsorship unavailable" message, so log
    // the underlying paymaster / bundler / EIP-7702 cause for diagnosis instead
    // of swallowing it.
    console.error('[sponsored] Pimlico sponsored write failed', error);

    if (isLikelySponsorshipFailure(error)) {
      throw new SponsorshipUnavailableError(
        'Network fee sponsorship is temporarily unavailable.',
        { cause: error }
      );
    }

    throw error;
  }
}

function isUserRejection(error: unknown): boolean {
  return getErrorText(error).some((detail) => {
    const looksUserScoped = detail.includes('user') || detail.includes('wallet');
    return (
      looksUserScoped &&
      ['reject', 'denied', 'cancelled', 'canceled'].some((pattern) =>
        detail.includes(pattern)
      )
    );
  });
}

function isLikelySponsorshipFailure(error: unknown): boolean {
  return getErrorText(error).some((detail) =>
    [
      'paymaster',
      'policy',
      'sponsor',
      'sponsorship',
      'bundler',
      'user operation',
      'useroperation',
      '7702',
      'calls status',
    ].some((pattern) => detail.includes(pattern))
  );
}

function getErrorText(error: unknown): string[] {
  const details = new Set<string>();
  const stack: unknown[] = [error];
  const seen = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    if (typeof current === 'string') {
      addDetail(details, current);
      continue;
    }

    if (current instanceof Error) {
      addDetail(details, current.message);
      stack.push(current.cause);
    }

    if (typeof current !== 'object' || seen.has(current)) {
      continue;
    }

    seen.add(current);

    const record = current as Record<string, unknown>;
    addDetail(details, record.shortMessage);
    addDetail(details, record.details);
    addDetail(details, record.message);
    addDetail(details, record.reason);
    stack.push(record.cause, record.error, record.data);
  }

  return Array.from(details);
}

function addDetail(details: Set<string>, value: unknown) {
  if (typeof value !== 'string') {
    return;
  }

  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (normalized) {
    details.add(normalized);
  }
}
