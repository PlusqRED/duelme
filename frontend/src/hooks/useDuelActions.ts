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
} from '@/lib/testnetGas';

type DuelPublicClient = NonNullable<ReturnType<typeof usePublicClient>>;

export function useDuelActions(chainId: number) {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const { address: accountAddress } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const shouldUseSepoliaGasBuffer =
    chainId === SUPPORTED_CHAINS.arbitrumSepolia.id &&
    publicClient !== undefined &&
    accountAddress !== undefined;

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

  async function createDuel(amount: bigint, inviteHash: `0x${string}`, message = '') {
    const args = message
      ? ([amount, inviteHash, message] as const)
      : ([amount, inviteHash] as const);
    const config = {
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'createDuel',
      args,
      chainId,
    } as const;

    if (shouldUseSepoliaGasBuffer) {
      const transactionParams = await getSepoliaTransactionParams(
        publicClient,
        (client) => client.estimateContractGas({
          ...config,
          account: accountAddress,
        }),
        ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS
      );

      writeContract({
        ...config,
        ...transactionParams,
      });
      return;
    }

    writeContract(config);
  }

  async function approveToken(token: `0x${string}`, amount: bigint) {
    const config = {
      address: token,
      abi: erc20Abi,
      functionName: 'approve',
      args: [contractAddress, amount],
      chainId,
    } as const;

    if (shouldUseSepoliaGasBuffer) {
      const transactionParams = await getSepoliaTransactionParams(
        publicClient,
        (client) => client.estimateContractGas({
          ...config,
          account: accountAddress,
        }),
        ARBITRUM_SEPOLIA_APPROVE_MIN_GAS
      );

      writeContract({
        ...config,
        ...transactionParams,
      });
      return;
    }

    writeContract({
      ...config,
    });
  }

  function joinDuel(duelId: bigint, inviteSecret: `0x${string}`) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'joinDuel',
      args: [duelId, inviteSecret],
      chainId,
    });
  }

  function declineDuel(duelId: bigint, inviteSecret: `0x${string}`) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'declineDuel',
      args: [duelId, inviteSecret],
      chainId,
    });
  }

  function claimVictory(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'claimVictory',
      args: [duelId],
      chainId,
    });
  }

  function requestMutualCancellation(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'requestMutualCancellation',
      args: [duelId],
      chainId,
    });
  }

  function acceptMutualCancellation(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'acceptMutualCancellation',
      args: [duelId],
      chainId,
    });
  }

  function declineMutualCancellation(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'declineMutualCancellation',
      args: [duelId],
      chainId,
    });
  }

  function withdrawMutualCancellationRequest(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'withdrawMutualCancellationRequest',
      args: [duelId],
      chainId,
    });
  }

  function claimPayout(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'claimPayout',
      args: [duelId],
      chainId,
    });
  }

  function claimPayouts(duelIds: bigint[]) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'claimPayouts',
      args: [duelIds],
      chainId,
    });
  }

  function admitDefeat(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'admitDefeat',
      args: [duelId],
      chainId,
    });
  }

  function confirmResult(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'confirmResult',
      args: [duelId],
      chainId,
    });
  }

  function disputeResult(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'disputeResult',
      args: [duelId],
      chainId,
    });
  }

  function refund(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'refund',
      args: [duelId],
      chainId,
    });
  }

  function refundAndClaimPayouts(duelIds: bigint[]) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'refundAndClaimPayouts',
      args: [duelIds],
      chainId,
    });
  }

  function cancelDuel(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'cancelDuel',
      args: [duelId],
      chainId,
    });
  }

  return {
    createDuel,
    approveToken,
    joinDuel,
    declineDuel,
    claimVictory,
    requestMutualCancellation,
    acceptMutualCancellation,
    declineMutualCancellation,
    withdrawMutualCancellationRequest,
    claimPayout,
    claimPayouts,
    admitDefeat,
    confirmResult,
    disputeResult,
    refund,
    refundAndClaimPayouts,
    cancelDuel,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    reset,
  };
}

async function getSepoliaTransactionParams(
  publicClient: DuelPublicClient,
  estimateGas: (publicClient: DuelPublicClient) => Promise<bigint>,
  minimumGas: bigint
) {
  const [estimatedGas, estimatedFees, latestBlock] = await Promise.all([
    estimateGas(publicClient),
    publicClient.estimateFeesPerGas(),
    publicClient.getBlock(),
  ]);

  return getBufferedTestnetTransactionParams({
    estimatedGas,
    minimumGas,
    feeEstimate: estimatedFees,
    baseFeePerGas: latestBlock.baseFeePerGas,
  });
}
