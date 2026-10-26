'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient, useSignTypedData, useSwitchChain } from 'wagmi';
import { useRelayedTransfer } from '@/hooks/useRelayedTransfer';
import { useWriteWithGas } from '@/hooks/useWriteWithGas';
import { emitBalanceRefreshBurst } from '@/lib/balanceRefresh';
import { USDT_ADDRESSES } from '@/lib/constants';
import { transferAbi } from '@/lib/contracts';
import { submitRelayTransfer } from '@/lib/relayApi';
import { TRANSFER_AUTHORIZATION_TYPES, transferAuthorization } from '@/lib/relayedTransfer';
import { classifySendError, isRelayDecline } from '@/lib/sendError';
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
 * `ethWei` is the wallet's ETH on that network: once the relayer has said no to this wallet, a
 * wallet that holds ETH pays itself (`resolveSendRoute`).
 */
export function useSendUsdt(chainId: number, ethWei: bigint | null) {
  const { address, chainId: walletChainId } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { switchChainAsync, error: switchError, reset: resetSwitch } = useSwitchChain();
  // Not a wallet client from this render: one taken before the switch below signs for the network
  // the wallet left. The mutation finds the wallet's client when it is called.
  const { signTypedDataAsync } = useSignTypedData();
  const { writeWithGas, relaySigned, hash, isConfirming, isSuccess, error, reset } = useWriteWithGas(chainId);
  const freeTransfer = useRelayedTransfer(chainId, address);
  const { refetch: refetchFreeTransfer } = freeTransfer;
  const [isRelayDeclined, setIsRelayDeclined] = useState(false);
  const route = resolveSendRoute(freeTransfer.status, isRelayDeclined, ethWei);

  const sendRelayed = useCallback(
    (to: `0x${string}`, raw: bigint) =>
      relaySigned(async (onSubmitted) => {
        if (!publicClient || !address) {
          throw new WalletNotReadyError();
        }
        const authorization = transferAuthorization(address, to, raw, Date.now());
        const domain = await readTokenDomain(publicClient, USDT_ADDRESSES[chainId], chainId);
        const signature = await signTypedDataAsync({
          account: address,
          domain,
          types: TRANSFER_AUTHORIZATION_TYPES,
          primaryType: 'TransferWithAuthorization',
          message: authorization,
        });

        // Signing is done; from here the relayer owns it.
        onSubmitted();
        try {
          return await submitRelayTransfer(chainId, {
            from: address,
            to,
            value: raw.toString(),
            validBefore: Number(authorization.validBefore),
            nonce: authorization.nonce,
            signature,
          });
        } catch (relayError) {
          if (isRelayDecline(relayError)) {
            setIsRelayDeclined(true);
            void refetchFreeTransfer();
          }
          throw relayError;
        }
      }),
    [relaySigned, publicClient, address, chainId, signTypedDataAsync, refetchFreeTransfer]
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
      freeTransfer: { status: freeTransfer.status, nextAt: freeTransfer.nextAt },
      hash,
      isConfirming,
      isSuccess,
      error: switchError ?? error,
      failure,
      reset: resetSend,
    }),
    [send, route, freeTransfer.status, freeTransfer.nextAt, hash, isConfirming, isSuccess, switchError, error, failure, resetSend]
  );
}
