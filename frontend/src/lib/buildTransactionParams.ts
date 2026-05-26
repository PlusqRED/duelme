import type { usePublicClient } from 'wagmi';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import {
  getBufferedTestnetTransactionParams,
  getMainnetTransactionParams,
} from '@/lib/testnetGas';

export type DuelPublicClient = NonNullable<ReturnType<typeof usePublicClient>>;
export type EstimateGasFn = (publicClient: DuelPublicClient) => Promise<bigint>;

export interface TransactionParams {
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  nonce: number;
}

// Builds the full set of explicit transaction parameters (gas, fees, nonce)
// before a write is signed. Privy embedded wallets sign with all-zero gas /
// nonce when their internal prepareTransactionRequest path runs — passing
// every value explicitly here avoids that codepath entirely. The "pending"
// block-tag for the nonce read lets back-to-back approve→join sequences pick
// up the next slot from the mempool.
export async function buildTransactionParams(
  publicClient: DuelPublicClient,
  account: `0x${string}`,
  estimateGas: EstimateGasFn,
  chainId: number,
  minimumTestnetGas: bigint
): Promise<TransactionParams> {
  const [estimatedGas, estimatedFees, latestBlock, nonce] = await Promise.all([
    estimateGas(publicClient),
    publicClient.estimateFeesPerGas(),
    publicClient.getBlock(),
    publicClient.getTransactionCount({ address: account, blockTag: 'pending' }),
  ]);

  const gasParams =
    chainId === SUPPORTED_CHAINS.arbitrumSepolia.id
      ? getBufferedTestnetTransactionParams({
          estimatedGas,
          minimumGas: minimumTestnetGas,
          feeEstimate: estimatedFees,
          baseFeePerGas: latestBlock.baseFeePerGas,
        })
      : getMainnetTransactionParams({
          estimatedGas,
          feeEstimate: estimatedFees,
          baseFeePerGas: latestBlock.baseFeePerGas,
        });

  return { ...gasParams, nonce };
}
