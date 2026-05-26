'use client';

import { useCallback, useState } from 'react';
import type { Abi, Hex } from 'viem';
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract,
} from 'wagmi';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import {
  buildTransactionParams,
  type DuelPublicClient,
  type TransactionParams,
} from '@/lib/buildTransactionParams';
import { duelMeAbi, erc20Abi } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';
import { broadcastWithFallback } from '@/lib/resilientBroadcast';
import {
  ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
  ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
} from '@/lib/testnetGas';

// Default min-gas floor used for non-create/approve actions on Sepolia.
// Sepolia's eth_estimateGas occasionally under-reports; this is generous but
// still fits inside a single L2 block. Mainnet ignores the floor.
const DEFAULT_TESTNET_MIN_GAS = 200_000n;

type WriteConfig = Parameters<ReturnType<typeof useWriteContract>['writeContract']>[0];
type EstimateContractGasConfig = Parameters<DuelPublicClient['estimateContractGas']>[0];

export function useDuelActions(chainId: number) {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const { address: accountAddress } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient({ chainId });
  const { activeWallet } = useActiveWallet();

  // Privy embedded wallets need a custom broadcast path because their
  // eth_sendTransaction handler uses a single-URL viem http() transport with
  // no fallback (chain.rpcUrls.privyWalletOverride.http[0]). External wallets
  // like MetaMask manage their own RPC reliably, so we leave them on wagmi's
  // standard writeContract path. See lib/resilientBroadcast.ts for the full
  // explanation.
  const isPrivyEmbedded = activeWallet?.walletClientType === 'privy';

  const {
    writeContract,
    data: wagmiHash,
    isPending: wagmiIsPending,
    error: wagmiError,
    reset: wagmiReset,
  } = useWriteContract();

  const [resilientHash, setResilientHash] = useState<Hex | undefined>(undefined);
  const [resilientIsPending, setResilientIsPending] = useState(false);
  const [resilientError, setResilientError] = useState<Error | null>(null);

  const hash = isPrivyEmbedded ? resilientHash : wagmiHash;
  const isPending = isPrivyEmbedded ? resilientIsPending : wagmiIsPending;
  const error = isPrivyEmbedded ? resilientError : wagmiError;

  const reset = useCallback(() => {
    setResilientHash(undefined);
    setResilientIsPending(false);
    setResilientError(null);
    wagmiReset();
  }, [wagmiReset]);

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  // We pre-fill gas / maxFeePerGas / maxPriorityFeePerGas / nonce on every write
  // so neither code path has to ask the wallet to populate them.
  //   - Privy embedded: avoids the all-zero gas params bug that surfaces when
  //     Privy's internal prepareTransactionRequest path runs. See Privy docs
  //     https://docs.privy.io/basics/react/advanced/configuring-evm-networks
  //     ("If you only pass a subset of the parameters, Privy will estimate the
  //     rest according to its defaults, which may result in unpredictable
  //     behavior.")
  //   - Injected wallets (MetaMask etc.): pre-filled values are accepted as-is
  //     and skip the wallet's own estimation round-trip.
  //
  // For Privy embedded wallets we ALSO route the broadcast through our wagmi
  // fallback transports (Alchemy → Tenderly → drpc → arb1.arbitrum.io) instead
  // of Privy's single-URL eth_sendTransaction — see lib/resilientBroadcast.ts
  // for the full explanation.
  async function writeWithGas(
    config: WriteConfig,
    minimumTestnetGas: bigint = DEFAULT_TESTNET_MIN_GAS
  ) {
    // Whether errors during this call get reported through the resilient state
    // or wagmi's writeContract state. Locked once per call so the consumer's
    // unified `error` selector reads from the same path that's actually
    // executing, even if `isPrivyEmbedded` changes during the await chain
    // (e.g. user switches wallet).
    const useResilientPath = isPrivyEmbedded;

    function reportError(err: unknown) {
      if (useResilientPath) {
        setResilientError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      // wagmi's useWriteContract handles its own error surface — we re-throw
      // a synthetic call so that downstream lifecycle hooks see wagmiError set.
      // The simplest way to surface a pre-write error through wagmi is to push
      // it through writeContract with an invalid config; instead we just log
      // and bail. Non-Privy users only hit this branch when publicClient is
      // missing, which is itself a wagmi misconfiguration, so the diagnostic
      // console.error is the right level.
      console.error('useDuelActions: pre-write failed for injected wallet', err);
    }

    if (!publicClient || !accountAddress) {
      reportError(new Error('Wallet or RPC client not ready'));
      return;
    }

    if (useResilientPath && !walletClient) {
      reportError(new Error('Embedded wallet client not ready — please retry'));
      return;
    }

    let params: TransactionParams;
    try {
      params = await buildTransactionParams(
        publicClient,
        accountAddress,
        (client) =>
          client.estimateContractGas({
            ...config,
            account: accountAddress,
          } as EstimateContractGasConfig),
        chainId,
        minimumTestnetGas
      );
    } catch (estimateError) {
      if (useResilientPath) {
        // Don't fall back to wagmi's writeContract for Privy users: it would
        // re-hit the single-URL broadcast bug AND the all-zero-gas bug.
        // Surface the error directly instead.
        reportError(estimateError);
        return;
      }
      // Injected wallets (MetaMask) handle their own RPC reliably, so we let
      // the wallet try to populate as a last resort.
      console.error('useDuelActions: gas pre-fill failed, falling back to wallet populate', estimateError);
      writeContract(config);
      return;
    }

    if (useResilientPath && walletClient) {
      setResilientHash(undefined);
      setResilientError(null);
      setResilientIsPending(true);

      try {
        const txHash = await broadcastWithFallback({
          walletClient,
          publicClient,
          account: accountAddress,
          chainId,
          to: config.address as `0x${string}`,
          abi: config.abi as Abi,
          functionName: config.functionName,
          args: config.args ?? [],
          gas: params.gas,
          maxFeePerGas: params.maxFeePerGas,
          maxPriorityFeePerGas: params.maxPriorityFeePerGas,
          nonce: params.nonce,
        });
        setResilientHash(txHash);
      } catch (broadcastError) {
        setResilientError(
          broadcastError instanceof Error ? broadcastError : new Error(String(broadcastError))
        );
      } finally {
        setResilientIsPending(false);
      }
      return;
    }

    writeContract({ ...config, ...params } as WriteConfig);
  }

  // Most duel actions take a single duelId and write to the DuelMe contract
  // with no per-action gas floor (Sepolia uses DEFAULT_TESTNET_MIN_GAS).
  function bindDuelMeWrite<TName extends string>(functionName: TName, minTestnetGas?: bigint) {
    return async (...args: readonly unknown[]) => {
      await writeWithGas(
        {
          address: contractAddress,
          abi: duelMeAbi,
          functionName,
          args,
          chainId,
        } as WriteConfig,
        minTestnetGas
      );
    };
  }

  async function createDuel(amount: bigint, inviteHash: `0x${string}`, message = '') {
    const args = message
      ? ([amount, inviteHash, message] as const)
      : ([amount, inviteHash] as const);
    await writeWithGas(
      {
        address: contractAddress,
        abi: duelMeAbi,
        functionName: 'createDuel',
        args,
        chainId,
      } as WriteConfig,
      ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS
    );
  }

  async function approveToken(token: `0x${string}`, amount: bigint) {
    await writeWithGas(
      {
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [contractAddress, amount],
        chainId,
      } as WriteConfig,
      ARBITRUM_SEPOLIA_APPROVE_MIN_GAS
    );
  }

  return {
    createDuel,
    approveToken,
    joinDuel: bindDuelMeWrite('joinDuel'),
    declineDuel: bindDuelMeWrite('declineDuel'),
    claimVictory: bindDuelMeWrite('claimVictory'),
    admitDefeat: bindDuelMeWrite('admitDefeat'),
    confirmResult: bindDuelMeWrite('confirmResult'),
    disputeResult: bindDuelMeWrite('disputeResult'),
    refund: bindDuelMeWrite('refund'),
    refundAndClaimPayouts: bindDuelMeWrite('refundAndClaimPayouts'),
    cancelDuel: bindDuelMeWrite('cancelDuel'),
    claimPayout: bindDuelMeWrite('claimPayout'),
    claimPayouts: bindDuelMeWrite('claimPayouts'),
    requestMutualCancellation: bindDuelMeWrite('requestMutualCancellation'),
    acceptMutualCancellation: bindDuelMeWrite('acceptMutualCancellation'),
    declineMutualCancellation: bindDuelMeWrite('declineMutualCancellation'),
    withdrawMutualCancellationRequest: bindDuelMeWrite('withdrawMutualCancellationRequest'),
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    reset,
  };
}
