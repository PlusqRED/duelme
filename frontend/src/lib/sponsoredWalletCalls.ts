import {
  encodeFunctionData,
  type Abi,
  type Account,
  type Chain,
  type Hex,
  type Transport,
  type WalletClient,
} from 'viem';
import { type SponsoredTransactionEnv } from '@/lib/sponsoredTransactionConfig';
import {
  requireSponsoredWriteConfig,
  rethrowSponsoredWriteError,
} from '@/lib/sponsoredTransactionErrors';

// Sponsored duel writes for EXTERNAL wallets (MetaMask etc.) via EIP-5792
// `wallet_sendCalls` + the ERC-7677 `paymasterService` capability. External
// wallets can't sign a raw EIP-7702 authorization for a dapp (that path needs
// key access, which only the Privy embedded wallet exposes — see
// lib/sponsoredTransactions), but wallets that report `paymasterService`
// support handle the delegation themselves and fetch sponsorship from the
// Pimlico URL we pass. msg.sender stays the user's own EOA address, so
// reputation and balances remain keyed to it.
//
// Error contract: SponsorshipUnavailableError is thrown ONLY before the wallet
// broadcast the batch, so the dispatcher (hooks/useWriteWithGas) can treat it
// as "safe to retry self-paid". Post-broadcast failures throw plain errors —
// the batch may have landed, and a retry could double-execute the action.

/** Per-chain wallet capabilities relevant to sponsorship (EIP-5792 shape). */
export interface ChainWalletCapabilities {
  paymasterService?: { supported: boolean };
}

export function supportsSponsoredWalletCalls(
  capabilities: ChainWalletCapabilities | undefined
): boolean {
  return capabilities?.paymasterService?.supported === true;
}

export interface SponsoredWalletCallsArgs {
  /** External wallet routed through wagmi — must support wallet_sendCalls. */
  walletClient: WalletClient<Transport, Chain | undefined, Account>;
  chainId: number;
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  /** Fired once the wallet accepted the batch and it is awaiting the chain. */
  onSubmitted?: () => void;
  /** Test seam — production callers rely on the process.env default. */
  env?: SponsoredTransactionEnv;
}

const LOG_LABEL = '[sponsored] EIP-5792 sponsored write failed';

export async function sendSponsoredWalletCalls({
  walletClient,
  chainId,
  address,
  abi,
  functionName,
  args,
  onSubmitted,
  env,
}: SponsoredWalletCallsArgs): Promise<Hex> {
  const config = requireSponsoredWriteConfig(chainId, address, functionName, env);
  const data = encodeFunctionData({ abi, functionName, args });

  let id: string;
  try {
    ({ id } = await walletClient.sendCalls({
      chain: config.chain,
      calls: [{ to: address, data, value: 0n }],
      capabilities: {
        paymasterService: {
          url: config.bundlerUrl,
          context: { sponsorshipPolicyId: config.sponsorshipPolicyId },
        },
      },
    }));
  } catch (error) {
    rethrowSponsoredWriteError(error, LOG_LABEL);
  }

  // Wallet accepted the batch; it now handles delegation + broadcast. From
  // here on, no SponsorshipUnavailableError (see the error contract above).
  onSubmitted?.();

  // viem's default 60s is too tight for backgrounded mobile/WalletConnect
  // wallets — timing out while the batch still lands invites a retry that
  // double-executes the action.
  const result = await walletClient.waitForCallsStatus({ id, timeout: 120_000 });

  if (result.status !== 'success') {
    console.error(LOG_LABEL, result);
    const reverted = result.receipts?.some((receipt) => receipt.status === 'reverted');
    throw new Error(
      reverted
        ? 'Gasless transaction reverted on-chain.'
        : `Gasless transaction failed (status code ${result.statusCode}).`
    );
  }

  const txHash = result.receipts?.[0]?.transactionHash;

  if (!txHash) {
    throw new Error('Gasless transaction confirmed without a receipt.');
  }

  return txHash;
}
