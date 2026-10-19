'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useWriteWithGas } from '@/hooks/useWriteWithGas';
import { emitBalanceRefreshBurst } from '@/lib/balanceRefresh';
import { USDT_ADDRESSES } from '@/lib/constants';
import { transferAbi } from '@/lib/contracts';
import type { Transfer } from '@/lib/sendUsdt';

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Sends USDT out of the wallet on `chainId`, the network the money is on. The wallet is moved there
 * first, and the transfer takes the duel writes' path, so its gas and nonce are filled in (Privy
 * signs all-zero gas otherwise) and its receipt decides whether it went through.
 */
export function useSendUsdt(chainId: number) {
  const { chainId: walletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeWithGas, canWrite, hash, isPending, isConfirming, isSuccess, error, reset } = useWriteWithGas(chainId);
  const [queued, setQueued] = useState<Transfer | null>(null);
  const sent = useRef<Transfer | null>(null);
  const [switchError, setSwitchError] = useState<Error | null>(null);

  // A transfer waits until the wallet is on its network and the write can reach it: the switch
  // resolves before React has rendered the wallet's client for the new network. Each one goes once.
  useEffect(() => {
    if (!queued || sent.current === queued || walletChainId !== chainId || !canWrite) {
      return;
    }
    sent.current = queued;
    void writeWithGas({
      address: USDT_ADDRESSES[chainId],
      abi: transferAbi,
      functionName: 'transfer',
      args: [queued.to, queued.raw],
      chainId,
    });
  }, [queued, walletChainId, chainId, canWrite, writeWithGas]);

  const send = useCallback(
    async (to: `0x${string}`, raw: bigint) => {
      setSwitchError(null);
      reset();
      setQueued({ to, raw });
      if (walletChainId === chainId) {
        return;
      }
      try {
        await switchChainAsync({ chainId });
      } catch (switchFailure) {
        setQueued(null);
        setSwitchError(toError(switchFailure));
      }
    },
    [chainId, walletChainId, switchChainAsync, reset]
  );

  // A transfer that went through moved the balances the wallet menu shows.
  useEffect(() => {
    if (isSuccess) {
      emitBalanceRefreshBurst();
    }
  }, [isSuccess]);

  const resetSend = useCallback(() => {
    setQueued(null);
    setSwitchError(null);
    reset();
  }, [reset]);

  return useMemo(
    () => ({
      send,
      hash,
      // A transfer not yet in the write hook's hands (the wallet still moving, the gas still being
      // estimated) is waiting for the wallet too.
      isPending: isPending || (queued !== null && !hash && !isConfirming && !isSuccess && !error),
      isConfirming,
      isSuccess,
      error: switchError ?? error,
      reset: resetSend,
    }),
    [send, hash, isPending, queued, isConfirming, isSuccess, switchError, error, resetSend]
  );
}
