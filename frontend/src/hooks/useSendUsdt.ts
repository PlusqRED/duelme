'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useWriteWithGas } from '@/hooks/useWriteWithGas';
import { emitBalanceRefreshBurst } from '@/lib/balanceRefresh';
import { USDT_ADDRESSES } from '@/lib/constants';
import { transferAbi } from '@/lib/contracts';

/**
 * Sends USDT out of the wallet on `chainId`, the network the money is on. The wallet is moved there
 * first, and the transfer takes the duel writes' path, so its gas and nonce are filled in (Privy
 * signs all-zero gas otherwise) and its receipt decides whether it went through.
 */
export function useSendUsdt(chainId: number) {
  const { chainId: walletChainId } = useAccount();
  const { switchChainAsync, error: switchError, reset: resetSwitch } = useSwitchChain();
  const { writeWithGas, hash, isConfirming, isSuccess, error, reset } = useWriteWithGas(chainId);

  const send = useCallback(
    async (to: `0x${string}`, raw: bigint) => {
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
      await writeWithGas({
        address: USDT_ADDRESSES[chainId],
        abi: transferAbi,
        functionName: 'transfer',
        args: [to, raw],
        chainId,
      });
    },
    [chainId, walletChainId, switchChainAsync, resetSwitch, writeWithGas, reset]
  );

  // A transfer that went through moved the balances the wallet menu shows.
  useEffect(() => {
    if (isSuccess) {
      emitBalanceRefreshBurst();
    }
  }, [isSuccess]);

  const resetSend = useCallback(() => {
    resetSwitch();
    reset();
  }, [resetSwitch, reset]);

  return useMemo(
    () => ({ send, hash, isConfirming, isSuccess, error: switchError ?? error, reset: resetSend }),
    [send, hash, isConfirming, isSuccess, switchError, error, resetSend]
  );
}
