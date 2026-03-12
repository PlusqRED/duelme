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

  function createDuel(amount: bigint, inviteHash: `0x${string}`, message = '') {
    writeContract({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'createDuel',
      args: message ? [amount, inviteHash, message] : [amount, inviteHash],
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
