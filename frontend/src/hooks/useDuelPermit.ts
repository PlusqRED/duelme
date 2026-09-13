'use client';

import { useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { DUELME_ADDRESSES } from '@/lib/constants';
import { getUsdtAddress } from '@/lib/contracts';
import { signErc2612Permit, type PermitSignature } from '@/lib/permitSignature';

/**
 * Signs an EIP-2612 permit letting DuelMe pull `value` of USDT from the active wallet.
 *
 * This is what replaces the separate `approve` transaction on the relayed path — the
 * signature rides inside the createDuelWithPermit / joinDuelWithPermit calldata, so funding
 * the wager costs the player nothing and needs no ETH.
 */
export function useDuelPermit(chainId: number) {
  const { address: accountAddress } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient({ chainId });

  const duelMeAddress = DUELME_ADDRESSES[chainId];
  const usdtAddress = getUsdtAddress(chainId);

  return useCallback(
    async (value: bigint): Promise<PermitSignature> => {
      if (!publicClient || !walletClient || !accountAddress || !usdtAddress || !duelMeAddress) {
        throw new Error('Wallet or RPC client not ready');
      }

      return signErc2612Permit({
        publicClient,
        walletClient,
        token: usdtAddress,
        owner: accountAddress,
        spender: duelMeAddress,
        value,
        chainId,
      });
    },
    [publicClient, walletClient, accountAddress, usdtAddress, duelMeAddress, chainId]
  );
}
