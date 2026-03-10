'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { duelMeAbi, erc20Abi } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';

export function useDuelActions(chainId: number) {
  const contractAddress = DUELME_ADDRESSES[chainId];

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

  function createDuel(amount: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'createDuel',
      args: [amount],
      chainId,
    });
  }

  function approveToken(token: `0x${string}`, amount: bigint) {
    writeContract({
      address: token,
      abi: erc20Abi,
      functionName: 'approve',
      args: [contractAddress, amount],
      chainId,
    });
  }

  function joinDuel(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'joinDuel',
      args: [duelId],
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

  function refund(duelId: bigint) {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'refund',
      args: [duelId],
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
    claimVictory,
    admitDefeat,
    confirmResult,
    refund,
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
