'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Hex } from 'viem';
import { useAccount, usePublicClient, useSignTypedData, useSwitchChain } from 'wagmi';
import { useRelayedTransfer } from '@/hooks/useRelayedTransfer';
import { useWriteWithGas } from '@/hooks/useWriteWithGas';
import { emitBalanceRefreshBurst } from '@/lib/balanceRefresh';
import { USDT_ADDRESSES } from '@/lib/constants';
import { transferAbi } from '@/lib/contracts';
import { RelayRequestError, submitRelayTransfer } from '@/lib/relayApi';
import {
  toRelayTransfer,
  TRANSFER_AUTHORIZATION_TYPES,
  transferAuthorization,
  type TransferAuthorization,
} from '@/lib/relayedTransfer';
import { classifySendError, isLastingSignFailure, isRelayDecline } from '@/lib/sendError';
import { resolveSendRoute, type Transfer } from '@/lib/sendUsdt';
import { readTokenDomain } from '@/lib/tokenDomain';
import { WalletNotReadyError } from '@/lib/writeErrors';

/**
 * Sends USDT out of the wallet on `chainId`, the network the money is on, after moving the wallet
 * there. The day's first transfer goes through DuelMe's relayer, which pays its fee: the wallet
 * signs a transfer authorization and nothing else. Every other one takes the duel writes' self-paid
 * path, so its gas and nonce are filled in (Privy signs all-zero gas otherwise) and the wallet pays
 * in ETH. Either way the receipt decides whether it went through.
 *
 * Once the relayed way has failed for this wallet today with nothing sent, the wallet pays itself
 * (`resolveSendRoute`). A failure that may have sent the transfer never counts: the wallet would pay
 * for it a second time, and so would a network that did not answer, which another go can get past.
 *
 * The authorization's time window and its day come from the chain's latest block, not the device's
 * clock, which the relayer and the token would not share.
 */
export function useSendUsdt(chainId: number) {
  const { address, chainId: walletChainId } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { switchChainAsync, error: switchError, reset: resetSwitch } = useSwitchChain();
  // Not a wallet client from this render: one taken before the switch below signs for the network
  // the wallet left. The mutation finds the wallet's client when it is called.
  const { signTypedDataAsync } = useSignTypedData();
  const { writeWithGas, relaySigned, hash, isConfirming, isSuccess, error, reset } = useWriteWithGas(chainId);
  const freeTransfer = useRelayedTransfer(chainId, address);
  const { status: freeStatus, refetch: refetchFreeTransfer } = freeTransfer;
  // The wallet, the network and the day it holds for: another of any of them gets the relayer again.
  const declineKey = `${chainId}:${address}:${freeTransfer.nextAt}`;
  const [declinedFor, setDeclinedFor] = useState<string | null>(null);
  const route = resolveSendRoute(freeStatus, declinedFor === declineKey);

  const sendRelayed = useCallback(
    (to: `0x${string}`, raw: bigint) =>
      relaySigned(async (onSubmitted) => {
        if (!publicClient || !address) {
          throw new WalletNotReadyError();
        }
        const decline = () => {
          setDeclinedFor(declineKey);
          void refetchFreeTransfer();
        };

        let authorization: TransferAuthorization;
        let signature: Hex;
        try {
          // Read as used since the form was sent: the relayer would refuse it, so nothing is signed.
          if (freeStatus === 'used') {
            throw new RelayRequestError('TRANSFER_USED', "Today's relayed transfer has already been sent.");
          }
          const [domain, block] = await Promise.all([
            readTokenDomain(publicClient, USDT_ADDRESSES[chainId], chainId),
            publicClient.getBlock(),
          ]);
          authorization = transferAuthorization(address, to, raw, Number(block.timestamp) * 1000);
          signature = await signTypedDataAsync({
            account: address,
            domain,
            types: TRANSFER_AUTHORIZATION_TYPES,
            primaryType: 'TransferWithAuthorization',
            message: authorization,
          });
        } catch (signError) {
          // Nothing has gone out. A failure another go would meet the same way leaves the relayed
          // way shut for now; the player's own no, or a network that did not answer, does not.
          if (isRelayDecline(signError) || isLastingSignFailure(signError)) {
            decline();
          }
          throw signError;
        }

        // Signing is done; from here the relayer owns it.
        onSubmitted();
        try {
          return await submitRelayTransfer(chainId, toRelayTransfer(authorization, signature));
        } catch (relayError) {
          if (isRelayDecline(relayError)) {
            decline();
          }
          throw relayError;
        }
      }),
    [relaySigned, publicClient, address, chainId, signTypedDataAsync, refetchFreeTransfer, freeStatus, declineKey]
  );

  const send = useCallback(
    async (transfer: Transfer) => {
      resetSwitch();
      reset();
      if (walletChainId !== chainId) {
        try {
          await switchChainAsync({ chainId });
        } catch {
          // useSwitchChain holds the refusal; it is this hook's error until the next send.
          return;
        }
      }
      if (transfer.route === 'relay') {
        await sendRelayed(transfer.to, transfer.raw);
        return;
      }
      await writeWithGas({
        address: USDT_ADDRESSES[chainId],
        abi: transferAbi,
        functionName: 'transfer',
        args: [transfer.to, transfer.raw],
        chainId,
      });
    },
    [chainId, walletChainId, switchChainAsync, resetSwitch, sendRelayed, writeWithGas, reset]
  );

  // A transfer that went through moved the balances the wallet menu shows, and a relayed one spent
  // the day's transfer.
  useEffect(() => {
    if (isSuccess) {
      emitBalanceRefreshBurst();
      void refetchFreeTransfer();
    }
  }, [isSuccess, refetchFreeTransfer]);

  const resetSend = useCallback(() => {
    resetSwitch();
    reset();
  }, [resetSwitch, reset]);

  const failure = useMemo(
    () =>
      switchError
        ? classifySendError(switchError, { chainId, isNetworkSwitch: true })
        : error
          ? classifySendError(error, { chainId })
          : null,
    [switchError, error, chainId]
  );

  return useMemo(
    () => ({
      send,
      route,
      freeTransfer: { status: freeStatus, nextAt: freeTransfer.nextAt },
      hash,
      isConfirming,
      isSuccess,
      failure,
      reset: resetSend,
    }),
    [send, route, freeStatus, freeTransfer.nextAt, hash, isConfirming, isSuccess, failure, resetSend]
  );
}
