import { encodeFunctionData, keccak256 } from 'viem';
import { transferWithAuthorizationAbi } from '@/lib/contracts';
import { parseRelayTransferPayload, transferAuthorizationArgs, type RelayTransfer } from '@/lib/relayedTransfer';
import type { RelayOutcome } from '@/lib/relayRequest';
import type { RelayerConfig } from '@/lib/relayerConfig';
import { relayOnce } from '@/lib/relayerDedup';
import {
  readRelayPost,
  relayAnswer,
  relayerFeeParams,
  relayFailure,
  sendBudgeted,
  sendUnderRelayerLock,
  type BroadcastOutcome,
} from '@/lib/relayerSend';
import { refuseWhileHeld } from '@/lib/relayerSignerHold';
import { ARBITRUM_SEPOLIA_DEFAULT_MIN_GAS, getBufferedMainnetGasLimit, getBufferedTestnetGasLimit } from '@/lib/testnetGas';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { simulateTransfer } from '@/lib/transferSimulation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Relays the wallet menu's USDT transfer for a wallet with no ETH for the fee: an EIP-3009
 * authorization the player signed, sent by the relayer to the token itself (`relayedTransfer.ts`).
 * The token holds it to one a day per wallet, through the day's nonce; the relayer only refuses a
 * nonce that is not today's.
 *
 * Admission follows `/api/relay`'s, cheapest first: the rate limit, the shape, the chain, the day
 * and the expiry, locally; a repeat gets the first post's answer, and a signer whose last relayed
 * transaction has no receipt yet waits; then the day's nonce, the balance and the token's own
 * simulation. Under the lock the hold and the simulation run again, then the transfer's gas is
 * booked against the same daily budgets as the wallet's duel actions, and it is sent.
 *
 * The signature names the sender, the recipient and the amount, so the relayer can neither move
 * another wallet's money nor change where this one goes.
 */
export async function POST(httpRequest: Request) {
  const post = await readRelayPost(httpRequest);
  if (!post.ok) {
    return post.response;
  }
  const { config, payload } = post;

  const parsed = parseRelayTransferPayload(payload, { chainId: config.chainId, nowMs: Date.now() });
  if (!parsed.ok) {
    return relayFailure(parsed.code, parsed.error, parsed.code === 'NOT_RELAYABLE' ? 403 : 400);
  }

  const { transfer } = parsed;
  let outcome: RelayOutcome;
  try {
    outcome = await relayOnce(relayTransferKey(transfer), () => relayTransfer(config, transfer));
  } catch (error) {
    console.error('[relay] unexpected transfer failure', error);
    return relayFailure('RELAYER_UNAVAILABLE', 'Relaying failed unexpectedly.', 502);
  }

  return relayAnswer(outcome);
}

/** The whole signed authorization, as the calldata it is sent as, blind to letter case. */
function relayTransferKey(transfer: RelayTransfer) {
  return keccak256(
    encodeFunctionData({
      abi: transferWithAuthorizationAbi,
      functionName: 'transferWithAuthorization',
      args: transferAuthorizationArgs(transfer),
    })
  );
}

async function relayTransfer(config: RelayerConfig, transfer: RelayTransfer): Promise<RelayOutcome> {
  const held = refuseWhileHeld(transfer.from);
  if (held) {
    return held;
  }
  const admission = await simulateTransfer(config, transfer);
  if (!admission.ok) {
    return admission;
  }

  return sendUnderRelayerLock(
    config,
    transfer.from,
    () => broadcastTransfer(config, transfer),
    'The transfer reverted on-chain.'
  );
}

/** Runs inside the relayer lock, like `/api/relay`'s broadcast, and for the same reasons. */
async function broadcastTransfer(config: RelayerConfig, transfer: RelayTransfer): Promise<BroadcastOutcome> {
  const held = refuseWhileHeld(transfer.from);
  if (held) {
    return held;
  }

  const { publicClient, walletClient } = config;
  const [simulation, feeEstimate, block, nonce] = await Promise.all([
    simulateTransfer(config, transfer),
    publicClient.estimateFeesPerGas(),
    publicClient.getBlock(),
    publicClient.getTransactionCount({ address: config.relayerAddress, blockTag: 'pending' }),
  ]);
  if (!simulation.ok) {
    return simulation;
  }

  const { maxFeePerGas, maxPriorityFeePerGas } = relayerFeeParams(config, feeEstimate, block.baseFeePerGas);
  // The self-paid path's buffers, and on the test network its floor: its estimates under-report.
  const gasLimit =
    config.chainId === SUPPORTED_CHAINS.arbitrumSepolia.id
      ? getBufferedTestnetGasLimit(simulation.estimate, ARBITRUM_SEPOLIA_DEFAULT_MIN_GAS)
      : getBufferedMainnetGasLimit(simulation.estimate);

  return sendBudgeted(config, transfer.from, gasLimit * maxFeePerGas, () =>
    walletClient.writeContract({
      chain: config.chain,
      account: config.account,
      address: config.usdtAddress,
      abi: transferWithAuthorizationAbi,
      functionName: 'transferWithAuthorization',
      args: transferAuthorizationArgs(transfer),
      gas: gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
    })
  );
}
