'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSignTransaction } from '@privy-io/react-auth';
import { skipToken, useQuery } from '@tanstack/react-query';
import type { Abi, Hex } from 'viem';
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from 'wagmi';
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
import { ARBITRUM_SEPOLIA_DEFAULT_MIN_GAS } from '@/lib/testnetGas';
import { EMBEDDED_WALLET_CLIENT_TYPE } from '@/lib/walletSelection';
import { isFinalReceiptError, WalletNotReadyError } from '@/lib/writeErrors';
import { waitForWriteReceipt } from '@/lib/writeReceipt';

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

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
  const { signTransaction } = useSignTransaction();
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

  const reset = useCallback(() => {
    setManagedHash(undefined);
    setManagedIsPending(false);
    setManagedIsConfirming(false);
    setManagedError(null);
    wagmiReset();
  }, [wagmiReset]);

  // Not wagmi's useWaitForTransactionReceipt: it watches the chain the wallet is on now, not the
  // one the write went to, and on a revert it guesses from how its replay of the call failed.
  // This read decides by the receipt: a revert or a replacement is final and ends the write in an
  // error; any other failure to read it says nothing about whether the transaction went through,
  // so the read keeps trying — a write reported as failed that went through is one "Try again"
  // away from being sent twice.
  const {
    isSuccess,
    data: receipt,
    error: receiptError,
  } = useQuery({
    queryKey: ['write-receipt', chainId, hash],
    queryFn: publicClient && hash ? () => waitForWriteReceipt(publicClient, hash) : skipToken,
    retry: (_failureCount, readError) => !isFinalReceiptError(readError),
    staleTime: Infinity,
  });
  const receiptEnd = isFinalReceiptError(receiptError) ? receiptError : null;
  // A sent write confirms until its receipt decides, whatever the read is doing meanwhile: paused
  // offline, it reports no loading, and the buttons it gates would send the write again.
  const isConfirming = managedIsConfirming || (!!hash && !isSuccess && !receiptEnd);
  const error = managedError ?? wagmiError ?? receiptEnd;

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
        setManagedError(toError(sendError));
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
        // Relaying is on (the caller routed here), so what is missing is the wallet's clients.
        setManagedError(new WalletNotReadyError());
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

  /**
   * Follows a write the relayer sends outside the forwarder — the wallet menu's USDT transfer,
   * which the token takes on the player's own signature — like any relayed write, receipt
   * included. `send` signs, calls `onSubmitted` once signing is done, and returns the relayer's hash.
   */
  const relaySigned = useCallback(
    (send: (onSubmitted: () => void) => Promise<Hex>) => runManagedSend(send),
    [runManagedSend]
  );

  // Writes pre-fill gas / fees / nonce so the wallet never auto-populates:
  //   - Privy embedded: auto-populate signs all-zero gas params (see
  //     https://docs.privy.io/basics/react/advanced/configuring-evm-networks),
  //     and Privy's single-URL eth_sendTransaction has no RPC fallback, so the
  //     broadcast also routes through lib/resilientBroadcast.
  //   - Injected wallets accept the pre-filled values as-is and skip their own
  //     estimation round-trip.
  const writeWithGas = useCallback(
    async (config: WriteConfig, minimumTestnetGas: bigint = ARBITRUM_SEPOLIA_DEFAULT_MIN_GAS) => {
      // A guard that bails reports through the managed error for every wallet type: nothing has
      // reached wagmi, so its own state would never tell the caller the write is over.
      if (!publicClient || !accountAddress) {
        setManagedError(new WalletNotReadyError());
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
          setManagedError(toError(estimateError));
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

      if (isPrivyEmbedded) {
        await runManagedSend(() =>
          broadcastWithFallback({
            // No wallet client: Privy signs for the transaction's own chain id, so a write sent
            // right after a network switch cannot sign with the network from before it.
            signTransaction,
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
      signTransaction,
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
      relaySigned,
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
      relaySigned,
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
