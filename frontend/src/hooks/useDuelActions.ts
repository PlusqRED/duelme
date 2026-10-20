'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Abi } from 'viem';
import { duelMeAbi, erc20Abi } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';
import { useWriteWithGas, type WriteConfig } from '@/hooks/useWriteWithGas';
import { useDuelPermit } from '@/hooks/useDuelPermit';
import {
  ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
  ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
} from '@/lib/testnetGas';
import type { SigningPhase } from '@/lib/signPlan';
import { fundingWrite, resolveWriteRoute, type FundingCall } from '@/lib/writeRoute';

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
 * *which* contract call to make rather than how to send it, and both are lib/writeRoute's
 * rules, which the signing window's plan follows too:
 *   - a relayable duel write goes through the relayer when it is available;
 *   - createDuel / joinDuel switch to their `*WithPermit` variants whenever the
 *     write is relayed, so funding needs no approve transaction. The allowance is
 *     not consulted: the signing flows stop reading it once relaying is on, and a
 *     permit costs one signature either way.
 *
 * `signingPhase` says which of a relayed write's signatures the wallet is asked for, so the
 * window can mark it.
 */
export function useDuelActions(chainId: number) {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const { writeWithGas, relayWrite, isRelayEnabled, reset: resetWrite, ...writeState } = useWriteWithGas(chainId);
  const signDuelPermit = useDuelPermit(chainId);
  const [signingPhase, setSigningPhase] = useState<SigningPhase | null>(null);

  const reset = useCallback(() => {
    setSigningPhase(null);
    resetWrite();
  }, [resetWrite]);

  const actions = useMemo(() => {
    // Defaults cover the common case: a DuelMe write with the dispatcher's
    // Sepolia min-gas floor.
    function bindWrite(
      functionName: string,
      { address = contractAddress, abi = duelMeAbi as Abi, minTestnetGas }: BindWriteOptions = {}
    ) {
      return (...args: readonly unknown[]) => {
        const config = { address, abi, functionName, args, chainId } as WriteConfig;

        if (resolveWriteRoute({ isRelayEnabled, target: address, contractAddress, functionName }) === 'relay') {
          setSigningPhase('request');
          return relayWrite(config);
        }

        setSigningPhase(null);
        return writeWithGas(config, minTestnetGas);
      };
    }

    const createDuelWrite = bindWrite('createDuel', {
      minTestnetGas: ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
    });
    const joinDuelWrite = bindWrite('joinDuel');

    /**
     * Funds a duel action with an EIP-2612 signature instead of an allowance: the permit first,
     * then the request carrying it, each a signature of its own.
     */
    async function relayWithPermit(call: FundingCall, amount: bigint, leadingArgs: readonly unknown[]) {
      setSigningPhase('permit');
      const permit = await signDuelPermit(amount);

      setSigningPhase('request');
      await relayWrite({
        address: contractAddress,
        abi: duelMeAbi as Abi,
        functionName: fundingWrite(call, true, contractAddress).functionName,
        args: [...leadingArgs, permit.deadline, permit.v, permit.r, permit.s],
        chainId,
      } as WriteConfig);
    }

    // Callers do not pass the route in: it is this hook's own isRelayEnabled either way.
    return {
      async createDuel(amount: bigint, inviteHash: `0x${string}`, message = '') {
        if (fundingWrite('createDuel', isRelayEnabled, contractAddress).route === 'relay') {
          await relayWithPermit('createDuel', amount, [amount, inviteHash, message]);
          return;
        }

        await createDuelWrite(...(message ? [amount, inviteHash, message] : [amount, inviteHash]));
      },
      async joinDuel(duelId: bigint | number, inviteSecret: `0x${string}`, wagerAmount: bigint) {
        if (fundingWrite('joinDuel', isRelayEnabled, contractAddress).route === 'relay') {
          await relayWithPermit('joinDuel', wagerAmount, [duelId, inviteSecret]);
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
  }, [writeWithGas, relayWrite, signDuelPermit, isRelayEnabled, contractAddress, chainId]);

  return useMemo(
    () => ({ ...actions, ...writeState, reset, isRelayEnabled, signingPhase }),
    [actions, writeState, reset, isRelayEnabled, signingPhase]
  );
}
