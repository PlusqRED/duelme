'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Abi } from 'viem';
import { duelMeAbi, erc20Abi } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';
import { RELAYABLE_DUEL_FUNCTIONS } from '@/lib/relayRequest';
import { useWriteWithGas, type WriteConfig } from '@/hooks/useWriteWithGas';
import { useDuelPermit } from '@/hooks/useDuelPermit';
import { isRelayAvailable, relayerStatusQuery } from '@/hooks/useRelayerStatus';
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
 * (hooks/useWriteWithGas), which owns wallet routing (relayed / resilient /
 * plain) and the merged hash/isPending/error result surface.
 *
 * Two decisions live here rather than in the dispatcher, because both are about
 * *which* contract call to make rather than how to send it:
 *   - a relayable duel write goes through the relayer when it is available;
 *   - createDuel / joinDuel switch to their `*WithPermit` variants whenever the
 *     write is relayed, so funding needs no approve transaction. The allowance is
 *     not consulted: the guided flows stop reading it once relaying is on, and a
 *     permit costs one signature either way.
 */
export function useDuelActions(chainId: number) {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const queryClient = useQueryClient();
  const { writeWithGas, relayWrite, isRelayEnabled, ...writeState } = useWriteWithGas(chainId);
  const { isRelayResolved } = writeState;
  const signDuelPermit = useDuelPermit(chainId);

  const actions = useMemo(() => {
    // The route is taken as the write is sent, not from the last render: a write sent while the
    // relay probe is still in flight waits for its answer instead of going self-paid for a player
    // the relayer would carry. A probe that cannot answer leaves the write self-paid, as before.
    async function sendsRelayed() {
      if (isRelayResolved) {
        return isRelayEnabled;
      }

      const status = await queryClient.fetchQuery(relayerStatusQuery).catch(() => undefined);
      return isRelayAvailable(status, chainId);
    }

    // Defaults cover the common case: a DuelMe write with the dispatcher's
    // Sepolia min-gas floor.
    function bindWrite(
      functionName: string,
      { address = contractAddress, abi = duelMeAbi as Abi, minTestnetGas }: BindWriteOptions = {}
    ) {
      return async (...args: readonly unknown[]) => {
        const config = { address, abi, functionName, args, chainId } as WriteConfig;

        // The relayer refuses anything outside its own allowlist, so the same list decides
        // here — an approve, for instance, is a token call and stays self-paid.
        if (address === contractAddress && RELAYABLE_DUEL_FUNCTIONS.has(functionName) && (await sendsRelayed())) {
          return relayWrite(config);
        }

        return writeWithGas(config, minTestnetGas);
      };
    }

    const createDuelWrite = bindWrite('createDuel', {
      minTestnetGas: ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
    });
    const joinDuelWrite = bindWrite('joinDuel');

    /**
     * Funds a duel action with an EIP-2612 signature instead of an allowance. Only used on
     * the relayed path: signing a permit would not save the player anything if they are
     * paying for the call itself anyway.
     */
    async function relayWithPermit(
      functionName: 'createDuelWithPermit' | 'joinDuelWithPermit',
      amount: bigint,
      leadingArgs: readonly unknown[]
    ) {
      const permit = await signDuelPermit(amount);

      await relayWrite({
        address: contractAddress,
        abi: duelMeAbi as Abi,
        functionName,
        args: [...leadingArgs, permit.deadline, permit.v, permit.r, permit.s],
        chainId,
      } as WriteConfig);
    }

    // Relaying is the only reason to sign a permit: it costs the player an extra signature,
    // which only pays for itself when it removes a transaction they would otherwise fund.
    // Callers do not pass that decision in — it is this hook's own route either way.
    return {
      async createDuel(amount: bigint, inviteHash: `0x${string}`, message = '') {
        if (await sendsRelayed()) {
          await relayWithPermit('createDuelWithPermit', amount, [amount, inviteHash, message]);
          return;
        }

        await createDuelWrite(...(message ? [amount, inviteHash, message] : [amount, inviteHash]));
      },
      async joinDuel(duelId: bigint | number, inviteSecret: `0x${string}`, wagerAmount: bigint) {
        if (await sendsRelayed()) {
          await relayWithPermit('joinDuelWithPermit', wagerAmount, [duelId, inviteSecret]);
          return;
        }

        await joinDuelWrite(duelId, inviteSecret);
      },
      async approveToken(token: `0x${string}`, amount: bigint) {
        await bindWrite('approve', {
          address: token,
          abi: erc20Abi as Abi,
          minTestnetGas: ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
        })(contractAddress, amount);
      },
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
  }, [writeWithGas, relayWrite, signDuelPermit, isRelayEnabled, isRelayResolved, queryClient, contractAddress, chainId]);

  return useMemo(
    () => ({ ...actions, ...writeState, isRelayEnabled }),
    [actions, writeState, isRelayEnabled]
  );
}
