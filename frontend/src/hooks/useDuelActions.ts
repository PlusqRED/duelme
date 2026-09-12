'use client';

import { useMemo } from 'react';
import type { Abi } from 'viem';
import { duelMeAbi, erc20Abi } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';
import { useWriteWithGas, type WriteConfig } from '@/hooks/useWriteWithGas';
import {
  ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
  ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
} from '@/lib/testnetGas';

interface BindWriteOptions {
  address?: `0x${string}`;
  abi?: Abi;
  minTestnetGas?: bigint;
}

/**
 * Binds every duel write action on top of the shared write dispatcher
 * (hooks/useWriteWithGas), which owns wallet routing (sponsored / resilient /
 * plain) and the merged hash/isPending/error result surface.
 */
export function useDuelActions(chainId: number) {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const { writeWithGas, ...writeState } = useWriteWithGas(chainId);

  const actions = useMemo(() => {
    // Defaults cover the common case: a DuelMe write with the dispatcher's
    // Sepolia min-gas floor.
    function bindWrite(
      functionName: string,
      { address = contractAddress, abi = duelMeAbi as Abi, minTestnetGas }: BindWriteOptions = {}
    ) {
      return (...args: readonly unknown[]) =>
        writeWithGas({ address, abi, functionName, args, chainId } as WriteConfig, minTestnetGas);
    }

    const createDuelWrite = bindWrite('createDuel', {
      minTestnetGas: ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
    });

    return {
      async createDuel(amount: bigint, inviteHash: `0x${string}`, message = '') {
        await createDuelWrite(...(message ? [amount, inviteHash, message] : [amount, inviteHash]));
      },
      async approveToken(token: `0x${string}`, amount: bigint) {
        await bindWrite('approve', {
          address: token,
          abi: erc20Abi as Abi,
          minTestnetGas: ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
        })(contractAddress, amount);
      },
      joinDuel: bindWrite('joinDuel'),
      declineDuel: bindWrite('declineDuel'),
      claimVictory: bindWrite('claimVictory'),
      admitDefeat: bindWrite('admitDefeat'),
      confirmResult: bindWrite('confirmResult'),
      disputeResult: bindWrite('disputeResult'),
      refund: bindWrite('refund'),
      refundAndClaimPayouts: bindWrite('refundAndClaimPayouts'),
      cancelDuel: bindWrite('cancelDuel'),
      claimPayout: bindWrite('claimPayout'),
      claimPayouts: bindWrite('claimPayouts'),
      requestMutualCancellation: bindWrite('requestMutualCancellation'),
      acceptMutualCancellation: bindWrite('acceptMutualCancellation'),
      declineMutualCancellation: bindWrite('declineMutualCancellation'),
      withdrawMutualCancellationRequest: bindWrite('withdrawMutualCancellationRequest'),
    };
  }, [writeWithGas, contractAddress, chainId]);

  return useMemo(() => ({ ...actions, ...writeState }), [actions, writeState]);
}
