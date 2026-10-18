'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Abi } from 'viem';
import { duelMeAbi, erc20Abi } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';
import { RELAYABLE_DUEL_FUNCTIONS } from '@/lib/relayRequest';
import { useWriteWithGas, type WriteConfig } from '@/hooks/useWriteWithGas';
import { useDuelPermit } from '@/hooks/useDuelPermit';
import { isRelayAvailable, relayerStatusQuery, useRelayerStatus } from '@/hooks/useRelayerStatus';
import {
  ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
  ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
} from '@/lib/testnetGas';

/** How a write goes out, or that it doesn't: its screen was closed while the route was unknown. */
type WriteRoute = 'relayed' | 'self-paid' | 'abandoned';

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
  const { writeWithGas, relayWrite, ...writeState } = useWriteWithGas(chainId);
  const { isRelayEnabled, isRelayResolved } = useRelayerStatus(chainId);
  const signDuelPermit = useDuelPermit(chainId);
  // Writes waiting for the relay probe before they are sent: they count as pending, so the
  // buttons that sent them stay disabled meanwhile.
  const [routingCount, setRoutingCount] = useState(0);
  // A write that waited for the probe is not sent once the screen that sent it is gone: its
  // wallet prompt would open on another page, with nothing there to follow the write.
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const actions = useMemo(() => {
    // The route is taken as the write is sent, not from the last render: a write sent while the
    // relay probe is still in flight waits for its answer instead of going self-paid for a player
    // the relayer would carry. A probe that cannot answer is "relaying off", the same answer
    // useRelayerStatus settles on, so the write goes self-paid. Each write asks once.
    async function routeOf(relayable: boolean): Promise<WriteRoute> {
      if (!relayable) {
        return 'self-paid';
      }

      if (isRelayResolved) {
        return isRelayEnabled ? 'relayed' : 'self-paid';
      }

      setRoutingCount((count) => count + 1);
      try {
        const status = await queryClient.fetchQuery(relayerStatusQuery).catch(() => undefined);

        if (!isMounted.current) {
          return 'abandoned';
        }

        return isRelayAvailable(status, chainId) ? 'relayed' : 'self-paid';
      } finally {
        setRoutingCount((count) => count - 1);
      }
    }

    // Defaults cover the common case: a DuelMe write with the dispatcher's
    // Sepolia min-gas floor.
    function selfPaidWrite(
      functionName: string,
      args: readonly unknown[],
      { address = contractAddress, abi = duelMeAbi as Abi, minTestnetGas }: BindWriteOptions = {}
    ) {
      return writeWithGas({ address, abi, functionName, args, chainId } as WriteConfig, minTestnetGas);
    }

    function bindWrite(
      functionName: string,
      { address = contractAddress, abi = duelMeAbi as Abi, minTestnetGas }: BindWriteOptions = {}
    ) {
      return async (...args: readonly unknown[]) => {
        // The relayer refuses anything outside its own allowlist, so the same list decides
        // here — an approve, for instance, is a token call and stays self-paid.
        const route = await routeOf(address === contractAddress && RELAYABLE_DUEL_FUNCTIONS.has(functionName));

        if (route === 'relayed') {
          await relayWrite({ address, abi, functionName, args, chainId } as WriteConfig);
        } else if (route === 'self-paid') {
          await selfPaidWrite(functionName, args, { address, abi, minTestnetGas });
        }
      };
    }

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
        const route = await routeOf(true);

        if (route === 'relayed') {
          await relayWithPermit('createDuelWithPermit', amount, [amount, inviteHash, message]);
          return;
        }

        if (route === 'abandoned') {
          return;
        }

        await selfPaidWrite('createDuel', message ? [amount, inviteHash, message] : [amount, inviteHash], {
          minTestnetGas: ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
        });
      },
      async joinDuel(duelId: bigint | number, inviteSecret: `0x${string}`, wagerAmount: bigint) {
        const route = await routeOf(true);

        if (route === 'relayed') {
          await relayWithPermit('joinDuelWithPermit', wagerAmount, [duelId, inviteSecret]);
          return;
        }

        if (route === 'abandoned') {
          return;
        }

        await selfPaidWrite('joinDuel', [duelId, inviteSecret]);
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

  const isPending = writeState.isPending || routingCount > 0;

  return useMemo(
    () => ({ ...actions, ...writeState, isPending, isRelayEnabled, isRelayResolved }),
    [actions, writeState, isPending, isRelayEnabled, isRelayResolved]
  );
}
