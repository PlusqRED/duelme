'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Abi, Hex } from 'viem';
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract,
} from 'wagmi';
import {
  buildTransactionParams,
  type DuelPublicClient,
  type TransactionParams,
} from '@/lib/buildTransactionParams';
import { broadcastWithFallback } from '@/lib/resilientBroadcast';
import { buildSignedForwardRequest } from '@/lib/forwardRequest';
import { submitRelayRequest } from '@/lib/relayApi';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { EMBEDDED_WALLET_CLIENT_TYPE } from '@/lib/walletSelection';

// Default min-gas floor used for non-create/approve actions on Sepolia.
// Sepolia's eth_estimateGas occasionally under-reports; this is generous but
// still fits inside a single L2 block. Mainnet ignores the floor.
const DEFAULT_TESTNET_MIN_GAS = 200_000n;

export type WriteConfig = Parameters<
  ReturnType<typeof useWriteContract>['writeContract']
>[0];
type EstimateContractGasConfig = Parameters<DuelPublicClient['estimateContractGas']>[0];

/**
 * The duel write dispatcher: routes every contract write down the right path
 * (gas relayer / resilient Privy broadcast / plain wagmi write) and exposes one
 * merged result surface. Composed by useDuelActions, which binds the per-action
 * functions on top and decides when a write needs an EIP-2612 permit.
 */
export function useWriteWithGas(chainId: number) {
  const { address: accountAddress } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient({ chainId });
  const { activeWallet } = useActiveWallet();
  const isPrivyEmbedded = activeWallet?.walletClientType === EMBEDDED_WALLET_CLIENT_TYPE;
  const { isRelayEnabled, forwarderAddress } = useRelayerStatus(chainId);

  const {
    writeContract,
    data: wagmiHash,
    isPending: wagmiIsPending,
    error: wagmiError,
    reset: wagmiReset,
  } = useWriteContract();

  // State for the paths this hook drives itself — the relayer and the Privy embedded
  // broadcast. External wallets report through wagmi's own useWriteContract state instead.
  const [managedHash, setManagedHash] = useState<Hex | undefined>(undefined);
  const [managedIsPending, setManagedIsPending] = useState(false);
  const [managedIsConfirming, setManagedIsConfirming] = useState(false);
  const [managedError, setManagedError] = useState<Error | null>(null);

  // Merged selectors: every dispatched write clears both surfaces first (see
  // writeWithGas), so at most one of them holds state for the current write.
  const hash = managedHash ?? wagmiHash;
  const isPending = managedIsPending || wagmiIsPending;
  const error = managedError ?? wagmiError;

  const reset = useCallback(() => {
    setManagedHash(undefined);
    setManagedIsPending(false);
    setManagedIsConfirming(false);
    setManagedError(null);
    wagmiReset();
  }, [wagmiReset]);

  const {
    isLoading: receiptIsConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });
  const isConfirming = managedIsConfirming || receiptIsConfirming;

  /**
   * Owns the pending → confirming → hash sequence for every write this hook sends itself.
   * `onSubmitted` marks the point where the user is done and the network has it, which the
   * relayer reaches after signing and the embedded path after broadcast.
   */
  const runManagedSend = useCallback(
    async (send: (onSubmitted: () => void) => Promise<Hex>) => {
      wagmiReset();
      setManagedHash(undefined);
      setManagedError(null);
      setManagedIsPending(true);

      try {
        setManagedHash(
          await send(() => {
            setManagedIsPending(false);
            setManagedIsConfirming(true);
          })
        );
      } catch (sendError) {
        setManagedError(sendError instanceof Error ? sendError : new Error(String(sendError)));
      } finally {
        setManagedIsPending(false);
        setManagedIsConfirming(false);
      }
    },
    [wagmiReset]
  );

  // Capability of the deployment, not of this render: client readiness is handled by the
  // guard inside relayWrite, so the flag callers plan their steps from cannot flip while
  // wagmi hydrates.
  const relayContext = useMemo(
    () =>
      isRelayEnabled && forwarderAddress && publicClient && walletClient && accountAddress
        ? { publicClient, walletClient, forwarderAddress, from: accountAddress }
        : null,
    [isRelayEnabled, forwarderAddress, publicClient, walletClient, accountAddress]
  );

  /**
   * Sends a write through the gas relayer. The player signs an EIP-712 ForwardRequest and
   * nothing else — no transaction, no ETH. The relayer only answers once the transaction is
   * on-chain, so the returned hash already has a receipt waiting for it.
   */
  const relayWrite = useCallback(
    async (config: WriteConfig) => {
      if (!relayContext) {
        setManagedError(new Error('Gasless relaying is not available'));
        return;
      }

      await runManagedSend(async (onSubmitted) => {
        const request = await buildSignedForwardRequest({
          ...relayContext,
          chainId,
          to: config.address as `0x${string}`,
          abi: config.abi as Abi,
          functionName: String(config.functionName),
          args: config.args ?? [],
        });

        // Signing is done; from here the relayer owns it.
        onSubmitted();

        return submitRelayRequest(chainId, request);
      });
    },
    [relayContext, runManagedSend, chainId]
  );

  // Writes pre-fill gas / fees / nonce so the wallet never auto-populates:
  //   - Privy embedded: auto-populate signs all-zero gas params (see
  //     https://docs.privy.io/basics/react/advanced/configuring-evm-networks),
  //     and Privy's single-URL eth_sendTransaction has no RPC fallback, so the
  //     broadcast also routes through lib/resilientBroadcast.
  //   - Injected wallets accept the pre-filled values as-is and skip their own
  //     estimation round-trip.
  const writeWithGas = useCallback(
    async (config: WriteConfig, minimumTestnetGas: bigint = DEFAULT_TESTNET_MIN_GAS) => {
      function reportError(err: unknown) {
        if (isPrivyEmbedded) {
          setManagedError(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        // Injected-wallet pre-write failures only happen on wagmi
        // misconfiguration (missing clients) — log and bail.
        console.error('useWriteWithGas: pre-write failed for injected wallet', err);
      }

      if (!publicClient || !accountAddress) {
        reportError(new Error('Wallet or RPC client not ready'));
        return;
      }

      if (isPrivyEmbedded && !walletClient) {
        reportError(new Error('Embedded wallet client not ready — please retry'));
        return;
      }

      // Clear both result surfaces so the merged selectors can't mix in stale
      // state from a previous write. Must stay BELOW the guards: a guard bail
      // must not tear down the previous write's hash / receipt watch.
      wagmiReset();
      setManagedHash(undefined);
      setManagedError(null);

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
        if (isPrivyEmbedded) {
          // No wagmi fallback for Privy: it would re-hit the single-URL
          // broadcast bug AND the all-zero-gas bug. Surface the error instead.
          reportError(estimateError);
          return;
        }
        // Injected wallets handle their own RPC reliably — let the wallet
        // populate as a last resort.
        console.error(
          'useWriteWithGas: gas pre-fill failed, falling back to wallet populate',
          estimateError
        );
        writeContract(config);
        return;
      }

      if (isPrivyEmbedded && walletClient) {
        await runManagedSend(() =>
          broadcastWithFallback({
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
          })
        );
        return;
      }

      writeContract({ ...config, ...params } as WriteConfig);
    },
    [
      chainId,
      accountAddress,
      publicClient,
      walletClient,
      isPrivyEmbedded,
      writeContract,
      wagmiReset,
      runManagedSend,
    ]
  );

  return useMemo(
    () => ({
      writeWithGas,
      relayWrite,
      isRelayEnabled,
      hash,
      isPending,
      isConfirming,
      isSuccess,
      receipt,
      error,
      reset,
    }),
    [
      writeWithGas,
      relayWrite,
      isRelayEnabled,
      hash,
      isPending,
      isConfirming,
      isSuccess,
      receipt,
      error,
      reset,
    ]
  );
}
