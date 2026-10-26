import { BaseError, ContractFunctionRevertedError } from 'viem';
import { balanceOfAbi, transferWithAuthorizationAbi } from '@/lib/contracts';
import { bestErrorDetail, collectErrorDetails } from '@/lib/errorDetails';
import { transferAuthorizationArgs, type RelayTransfer } from '@/lib/relayedTransfer';
import { refusal, type RelayRefusal } from '@/lib/relayRequest';
import type { RelayerConfig } from '@/lib/relayerConfig';

export type TransferSimulation = { ok: true; estimate: bigint } | RelayRefusal;

/**
 * Everything that can refuse a relayed transfer without the relayer's own nonce, run before the
 * request may queue for the lock and again under it: the day's nonce still unspent, the balance
 * behind it, then the token's own simulation of `transferWithAuthorization` as the relayer would
 * send it, which checks the signature and the expiry.
 */
export async function simulateTransfer(config: RelayerConfig, transfer: RelayTransfer): Promise<TransferSimulation> {
  const { publicClient, usdtAddress } = config;
  const [used, balance] = await Promise.all([
    publicClient.readContract({
      address: usdtAddress,
      abi: transferWithAuthorizationAbi,
      functionName: 'authorizationState',
      args: [transfer.from, transfer.nonce],
    }),
    publicClient.readContract({ address: usdtAddress, abi: balanceOfAbi, functionName: 'balanceOf', args: [transfer.from] }),
  ]);

  if (used) {
    return usedToday();
  }
  if (balance < BigInt(transfer.value)) {
    return refusal('INSUFFICIENT_BALANCE', 'The wallet holds less USDT than this transfer.', 409);
  }

  try {
    const estimate = await publicClient.estimateContractGas({
      address: usdtAddress,
      abi: transferWithAuthorizationAbi,
      functionName: 'transferWithAuthorization',
      args: transferAuthorizationArgs(transfer),
      account: config.relayerAddress,
    });
    return { ok: true, estimate };
  } catch (error) {
    return describeRevert(error, transfer.from);
  }
}

function usedToday(): RelayRefusal {
  return refusal('TRANSFER_USED', "This wallet's relayed transfer for today has already been sent.", 409);
}

/**
 * The token's reason for refusing, in the refusal the client words for the player. USD₮0 and
 * MockUSDT revert with the same strings: "auth invalid" for a spent nonce, "invalid signature"
 * for a signature it will not take — which, for a wallet with code (an EIP-7702 delegation), it
 * checks through ERC-1271. An estimate that failed without a revert says nothing about the
 * transfer, so it is the relayer's failure, not the player's.
 */
function describeRevert(error: unknown, from: string): RelayRefusal {
  const details = collectErrorDetails(error);
  const isRevert =
    (error instanceof BaseError && !!error.walk((cause) => cause instanceof ContractFunctionRevertedError)) ||
    details.some((detail) => detail.includes('revert'));

  if (!isRevert) {
    console.error('[relay] transfer estimate failed without a revert', error);
    return refusal('RELAYER_UNAVAILABLE', 'Could not price this transaction right now.', 502);
  }

  console.error(`[relay] transfer would revert for ${from}`);
  if (details.some((detail) => detail.includes('auth invalid'))) {
    return usedToday();
  }
  if (details.some((detail) => detail.includes('invalid signature'))) {
    return refusal('INVALID_SIGNATURE', 'USDT refused the signature on this transfer.', 400);
  }
  const reason = bestErrorDetail(error);
  return refusal('EXECUTION_REVERTED', reason ? `The transfer would revert: ${reason}` : 'The transfer would revert.', 400);
}
