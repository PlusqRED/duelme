'use client';

import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { duelMeAbi, erc20Abi } from '@/lib/contracts';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';
import {
  ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
  ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
  getBufferedTestnetTransactionParams,
  getMainnetTransactionParams,
} from '@/lib/testnetGas';

type DuelPublicClient = NonNullable<ReturnType<typeof usePublicClient>>;
type EstimateGasFn = (publicClient: DuelPublicClient) => Promise<bigint>;

// Default min-gas floor used for non-create/approve actions on Sepolia.
// Sepolia's eth_estimateGas occasionally under-reports; this is generous but
// still fits inside a single L2 block. Mainnet ignores the floor.
const DEFAULT_TESTNET_MIN_GAS = 200_000n;

async function buildTransactionParams(
  publicClient: DuelPublicClient,
  account: `0x${string}`,
  estimateGas: EstimateGasFn,
  chainId: number,
  minimumTestnetGas: bigint
) {
  const [estimatedGas, estimatedFees, latestBlock, nonce] = await Promise.all([
    estimateGas(publicClient),
    publicClient.estimateFeesPerGas(),
    publicClient.getBlock(),
    // Pulling nonce ourselves: Privy's prepareTransactionRequest path silently
    // drops the nonce-fill step after viem caches eth_fillTransaction=false on
    // the client, leaving the signed transaction with nonce: 0. The "pending"
    // tag includes any tx already in the mempool from the same wallet, so
    // back-to-back approve→join sequences pick up the next slot correctly.
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

type WriteConfig = Parameters<ReturnType<typeof useWriteContract>['writeContract']>[0];
type EstimateContractGasConfig = Parameters<DuelPublicClient['estimateContractGas']>[0];

export function useDuelActions(chainId: number) {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const { address: accountAddress } = useAccount();
  const publicClient = usePublicClient({ chainId });

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  // Privy embedded wallets sign with all-zero gas params when their internal
  // prepareTransactionRequest path runs — see Privy docs:
  // https://docs.privy.io/basics/react/advanced/configuring-evm-networks
  // ("If you only pass a subset of the parameters, Privy will estimate the
  // rest according to its defaults, which may result in unpredictable
  // behavior.") We pre-fill gas / maxFeePerGas / maxPriorityFeePerGas on every
  // write so the wallet provider never has to populate them. MetaMask and
  // other injected wallets accept the explicit values too.
  async function writeWithGas(
    config: WriteConfig,
    minimumTestnetGas: bigint = DEFAULT_TESTNET_MIN_GAS
  ) {
    if (!publicClient || !accountAddress) {
      writeContract(config);
      return;
    }

    try {
      const params = await buildTransactionParams(
        publicClient,
        accountAddress,
        (client) =>
          client.estimateContractGas({
            ...config,
            account: accountAddress,
          } as EstimateContractGasConfig),
        chainId,
        minimumTestnetGas
      );
      writeContract({ ...config, ...params } as WriteConfig);
    } catch (estimateError) {
      // Estimate failure is rare (drpc returns 5xx, contract simulation reverts).
      // Surface it so it's not a silent UX dead-end, then let the wallet try to
      // populate as a last resort — on mainnet with Privy this still fails but
      // the user at least sees the same end-state as before this safeguard.
      console.error('useDuelActions: gas pre-fill failed, falling back to wallet populate', estimateError);
      writeContract(config);
    }
  }

  // Most duel actions take a single duelId and write to the DuelMe contract
  // with no per-action gas floor (Sepolia uses DEFAULT_TESTNET_MIN_GAS).
  function bindDuelMeWrite<TName extends string>(functionName: TName, minTestnetGas?: bigint) {
    return async (...args: readonly unknown[]) => {
      await writeWithGas(
        {
          address: contractAddress,
          abi: duelMeAbi,
          functionName,
          args,
          chainId,
        } as WriteConfig,
        minTestnetGas
      );
    };
  }

  async function createDuel(amount: bigint, inviteHash: `0x${string}`, message = '') {
    const args = message
      ? ([amount, inviteHash, message] as const)
      : ([amount, inviteHash] as const);
    await writeWithGas(
      {
        address: contractAddress,
        abi: duelMeAbi,
        functionName: 'createDuel',
        args,
        chainId,
      } as WriteConfig,
      ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS
    );
  }

  async function approveToken(token: `0x${string}`, amount: bigint) {
    await writeWithGas(
      {
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [contractAddress, amount],
        chainId,
      } as WriteConfig,
      ARBITRUM_SEPOLIA_APPROVE_MIN_GAS
    );
  }

  return {
    createDuel,
    approveToken,
    joinDuel: bindDuelMeWrite('joinDuel'),
    declineDuel: bindDuelMeWrite('declineDuel'),
    claimVictory: bindDuelMeWrite('claimVictory'),
    admitDefeat: bindDuelMeWrite('admitDefeat'),
    confirmResult: bindDuelMeWrite('confirmResult'),
    disputeResult: bindDuelMeWrite('disputeResult'),
    refund: bindDuelMeWrite('refund'),
    refundAndClaimPayouts: bindDuelMeWrite('refundAndClaimPayouts'),
    cancelDuel: bindDuelMeWrite('cancelDuel'),
    claimPayout: bindDuelMeWrite('claimPayout'),
    claimPayouts: bindDuelMeWrite('claimPayouts'),
    requestMutualCancellation: bindDuelMeWrite('requestMutualCancellation'),
    acceptMutualCancellation: bindDuelMeWrite('acceptMutualCancellation'),
    declineMutualCancellation: bindDuelMeWrite('declineMutualCancellation'),
    withdrawMutualCancellationRequest: bindDuelMeWrite('withdrawMutualCancellationRequest'),
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    reset,
  };
}
