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
import { useSign7702Authorization } from '@privy-io/react-auth';
import {
  buildTransactionParams,
  type DuelPublicClient,
  type TransactionParams,
} from '@/lib/buildTransactionParams';
import { broadcastWithFallback } from '@/lib/resilientBroadcast';
import { isSponsoredWriteAllowed } from '@/lib/sponsoredTransactionConfig';
import { SponsorshipUnavailableError } from '@/lib/sponsoredTransactionErrors';
import { sendSponsoredContractWrite } from '@/lib/sponsoredTransactions';
import { sendSponsoredWalletCalls } from '@/lib/sponsoredWalletCalls';
import { useSponsoredFees } from '@/hooks/useSponsoredFees';

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
 * for the active wallet (sponsored EIP-7702 / sponsored EIP-5792 / resilient
 * Privy broadcast / plain wagmi write) and exposes one merged result surface.
 * Composed by useDuelActions, which binds the per-action functions on top.
 */
export function useWriteWithGas(chainId: number) {
  const { address: accountAddress } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient({ chainId });
  const { signAuthorization } = useSign7702Authorization();

  // Single source of truth for wallet type + sponsorship — the same hook
  // drives the Header fees badge, so routing and UI cannot drift.
  const { isPrivyEmbedded, embeddedSponsored, externalSponsored } =
    useSponsoredFees(chainId);

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
  const [sponsoredIsConfirming, setSponsoredIsConfirming] = useState(false);

  // Merged selectors: every dispatched write clears both surfaces first (see
  // writeWithGas), so at most one of them holds state for the current write —
  // Privy embedded and external-sponsored writes report through the resilient
  // state, plain external writes through wagmi's useWriteContract state.
  const hash = resilientHash ?? wagmiHash;
  const isPending = resilientIsPending || wagmiIsPending;
  const error = resilientError ?? wagmiError;

  const reset = useCallback(() => {
    setResilientHash(undefined);
    setResilientIsPending(false);
    setResilientError(null);
    setSponsoredIsConfirming(false);
    wagmiReset();
  }, [wagmiReset]);

  const {
    isLoading: receiptIsConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });
  const isConfirming = sponsoredIsConfirming || receiptIsConfirming;

  // Direct (non-sponsored) writes pre-fill gas / fees / nonce so the wallet
  // never auto-populates:
  //   - Privy embedded: auto-populate signs all-zero gas params (see
  //     https://docs.privy.io/basics/react/advanced/configuring-evm-networks),
  //     and Privy's single-URL eth_sendTransaction has no RPC fallback, so the
  //     broadcast also routes through lib/resilientBroadcast.
  //   - Injected wallets accept the pre-filled values as-is and skip their own
  //     estimation round-trip.
  // Sponsored writes skip the pre-fill — the paymaster/bundler prices the op.
  const writeWithGas = useCallback(
    async (config: WriteConfig, minimumTestnetGas: bigint = DEFAULT_TESTNET_MIN_GAS) => {
      const allowlisted = isSponsoredWriteAllowed(
        chainId,
        config.address as `0x${string}` | undefined,
        String(config.functionName ?? '')
      );

      function reportError(err: unknown) {
        if (isPrivyEmbedded || externalSponsored) {
          setResilientError(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        // Injected non-sponsored pre-write failures only happen on wagmi
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
      setResilientHash(undefined);
      setResilientError(null);

      // Runs a write through the resilient state surface: pending until the
      // user signs, confirming once broadcast, then the hash feeds the receipt
      // watcher. Returns the failure (null on success) so call sites choose
      // between surfacing it and falling back.
      async function runManagedWrite(
        send: (onSubmitted: () => void) => Promise<Hex>
      ): Promise<unknown> {
        setResilientIsPending(true);
        setSponsoredIsConfirming(false);
        try {
          const txHash = await send(() => {
            setResilientIsPending(false);
            setSponsoredIsConfirming(true);
          });
          setResilientHash(txHash);
          return null;
        } catch (writeError) {
          return writeError;
        } finally {
          setResilientIsPending(false);
          setSponsoredIsConfirming(false);
        }
      }

      const sponsoredCall = {
        chainId,
        address: config.address as `0x${string}`,
        abi: config.abi as Abi,
        functionName: String(config.functionName),
        args: config.args ?? [],
      };

      const sponsoredSend =
        !allowlisted || !walletClient
          ? null
          : embeddedSponsored
            ? (onSubmitted: () => void) =>
                sendSponsoredContractWrite({
                  ...sponsoredCall,
                  walletClient,
                  publicClient,
                  signAuthorization,
                  onSubmitted,
                })
            : externalSponsored
              ? (onSubmitted: () => void) =>
                  sendSponsoredWalletCalls({ ...sponsoredCall, walletClient, onSubmitted })
              : null;

      if (sponsoredSend) {
        const sponsoredError = await runManagedWrite(sponsoredSend);
        if (!sponsoredError) {
          return;
        }

        // External wallets can pay their own gas, so pre-broadcast sponsorship
        // failures (policy spend cap, paymaster outage) fall through to the
        // self-paid path below. sendSponsoredWalletCalls throws
        // SponsorshipUnavailableError only BEFORE the wallet broadcast the
        // batch, so falling through cannot double-execute; user rejections are
        // a different type and surface without a re-prompt.
        const fallBackToSelfPaid =
          !isPrivyEmbedded && sponsoredError instanceof SponsorshipUnavailableError;

        if (!fallBackToSelfPaid) {
          reportError(sponsoredError);
          return;
        }

        console.error(
          'useWriteWithGas: sponsorship unavailable, falling back to self-paid gas',
          sponsoredError
        );
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
        const broadcastError = await runManagedWrite(() =>
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
        if (broadcastError) {
          reportError(broadcastError);
        }
        return;
      }

      writeContract({ ...config, ...params } as WriteConfig);
    },
    [
      chainId,
      accountAddress,
      publicClient,
      walletClient,
      signAuthorization,
      isPrivyEmbedded,
      embeddedSponsored,
      externalSponsored,
      writeContract,
      wagmiReset,
    ]
  );

  return useMemo(
    () => ({ writeWithGas, hash, isPending, isConfirming, isSuccess, receipt, error, reset }),
    [writeWithGas, hash, isPending, isConfirming, isSuccess, receipt, error, reset]
  );
}
