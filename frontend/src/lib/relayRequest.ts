import { decodeFunctionData, isAddress, isHex, type Hex } from 'viem';
import { duelMeAbi } from '@/lib/contracts';

/**
 * Wire shape of an ERC-2771 forward request. `value` and `gas` travel as decimal strings
 * because JSON has no bigint; `deadline` is a uint48, which fits a JS number exactly.
 *
 * There is deliberately no `nonce` field — OpenZeppelin 5.x reads the signer's current
 * {Nonces} value at execution time and folds it into the signed struct hash through the
 * typehash, so sending one would be meaningless and tampering with it impossible.
 */
export interface RelayForwardRequest {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  gas: string;
  deadline: number;
  data: Hex;
  signature: Hex;
}

export interface RelayRequestBody {
  chainId: number;
  request: RelayForwardRequest;
}

export interface RelaySuccessResponse {
  hash: Hex;
}

/** GET /api/relay — whether this deployment relays, and for which chain. */
export interface RelayerStatus {
  available: boolean;
  chainId: number | null;
}

export interface RelayErrorResponse {
  code: RelayErrorCode;
  error: string;
}

export type RelayErrorCode =
  | 'INVALID_REQUEST'
  | 'NOT_RELAYABLE'
  | 'INVALID_SIGNATURE'
  | 'BUDGET_EXCEEDED'
  | 'RELAYER_UNAVAILABLE'
  | 'EXECUTION_REVERTED';

/**
 * Duel actions the relayer is willing to pay for. Everything else — owner controls, the
 * emergency timelock, token rescue — is refused outright, so a leaked relayer key cannot be
 * spent driving admin calls.
 *
 * This list is NOT what keeps admin calls off the forwarder: ERC2771Forwarder.execute is
 * permissionless, so anyone holding a signed request can submit it and pay for it
 * themselves. DuelMe._checkOwner is pinned to msg.sender for that.
 */
export const RELAYABLE_DUEL_FUNCTIONS: ReadonlySet<string> = new Set([
  'acceptMutualCancellation',
  'admitDefeat',
  'cancelDuel',
  'claimPayout',
  'claimPayoutTo',
  'claimPayouts',
  'claimPayoutsTo',
  'claimVictory',
  'confirmResult',
  'createDuel',
  'createDuelFor',
  'createDuelForWithPermit',
  'createDuelWithPermit',
  'declineDuel',
  'declineMutualCancellation',
  'disputeResult',
  'joinDuel',
  'joinDuelWithPermit',
  'refund',
  'refundAndClaimPayouts',
  'refundAndClaimPayoutsTo',
  'requestMutualCancellation',
  'withdrawMutualCancellationRequest',
]);

/** Upper bound on what a single request may ask the relayer to forward. */
export const MAX_RELAY_REQUEST_GAS = 2_000_000n;

/** uint48 ceiling — the forwarder's deadline type. */
const MAX_UINT48 = 281_474_976_710_655;

/**
 * Gas `execute` itself spends around the forwarded call: EIP-712 hashing, ECDSA recovery,
 * the isTrustedForwarder staticcall, the nonce write and the event (~25k measured against
 * the deployed forwarder), plus the transaction's intrinsic cost and calldata.
 */
const FORWARDER_EXECUTE_OVERHEAD = 80_000n;

/**
 * Gas limit for the relayer's outer transaction.
 *
 * `ERC2771Forwarder._checkForwardedGas` triggers `invalid()` — consuming the entire limit,
 * not just the unused part — when the inner call did not get the gas the request promised.
 * EIP-150 leaves only 63/64 of the available gas to a subcall, so `request.gas * 64 / 63`
 * of *computational* gas has to still be available when `execute` reaches the CALL.
 *
 * On Arbitrum the L1 posting fee is charged out of this same limit, and only
 * `eth_estimateGas` knows how large it is. So the floor is added ON TOP of the estimate
 * rather than compared against it: `max(floor, estimate)` would pick the estimate whenever
 * the L1 component is large and leave the forwarded call short. Unused gas is refunded, so
 * the only cost of over-provisioning is a larger worst-case budget reservation.
 */
export function relayGasLimit(requestGas: bigint, executeEstimate: bigint): bigint {
  return executeEstimate + (requestGas * 64n) / 63n + FORWARDER_EXECUTE_OVERHEAD;
}

export type RelayPayloadResult =
  | { ok: true; body: RelayRequestBody; functionName: string }
  | { ok: false; code: RelayErrorCode; error: string };

/**
 * Validates an untrusted request body down to the duel function it would call. Everything
 * here is cheap and local — it runs before any RPC call so a malformed or disallowed
 * request never costs the relayer a round trip.
 */
export interface RelayTarget {
  chainId: number;
  duelMeAddress: string | undefined;
}

export function parseRelayPayload(payload: unknown, target: RelayTarget): RelayPayloadResult {
  if (!isRecord(payload)) {
    return invalid('Request body must be a JSON object.');
  }

  const { chainId, request } = payload;

  if (typeof chainId !== 'number' || !Number.isInteger(chainId) || chainId <= 0) {
    return invalid('chainId must be a positive integer.');
  }

  // The chain check belongs with the other admission rules, not in the route: it is the one
  // that stops a signature valid on another deployment from being replayed here, and it is
  // covered by the same test suite as its siblings.
  if (chainId !== target.chainId) {
    return {
      ok: false,
      code: 'NOT_RELAYABLE',
      error: `This relayer only serves chain ${target.chainId}.`,
    };
  }

  if (!isRecord(request)) {
    return invalid('request must be an object.');
  }

  const { from, to, value, gas, deadline, data, signature } = request;

  if (typeof from !== 'string' || !isAddress(from)) {
    return invalid('request.from must be an address.');
  }

  if (typeof to !== 'string' || !isAddress(to)) {
    return invalid('request.to must be an address.');
  }

  if (!target.duelMeAddress || to.toLowerCase() !== target.duelMeAddress.toLowerCase()) {
    return { ok: false, code: 'NOT_RELAYABLE', error: 'request.to is not the DuelMe contract on this chain.' };
  }

  const parsedValue = parseUintString(value);
  if (parsedValue === null || parsedValue !== 0n) {
    // DuelMe has no payable entry point, and the relayer never funds one.
    return invalid('request.value must be "0".');
  }

  const parsedGas = parseUintString(gas);
  if (parsedGas === null || parsedGas === 0n || parsedGas > MAX_RELAY_REQUEST_GAS) {
    return invalid(`request.gas must be between 1 and ${MAX_RELAY_REQUEST_GAS}.`);
  }

  if (typeof deadline !== 'number' || !Number.isInteger(deadline) || deadline < 0 || deadline > MAX_UINT48) {
    return invalid('request.deadline must be a uint48.');
  }

  if (typeof data !== 'string' || !isHex(data) || data.length < 10) {
    return invalid('request.data must be hex calldata.');
  }

  if (typeof signature !== 'string' || !isHex(signature)) {
    return invalid('request.signature must be hex.');
  }

  let functionName: string;
  try {
    ({ functionName } = decodeFunctionData({ abi: duelMeAbi, data }));
  } catch {
    return { ok: false, code: 'NOT_RELAYABLE', error: 'request.data does not decode against the DuelMe ABI.' };
  }

  if (!RELAYABLE_DUEL_FUNCTIONS.has(functionName)) {
    return { ok: false, code: 'NOT_RELAYABLE', error: `${functionName} is not relayable.` };
  }

  return {
    ok: true,
    functionName,
    body: {
      chainId,
      request: { from, to, value: parsedValue.toString(), gas: parsedGas.toString(), deadline, data, signature },
    },
  };
}

/** The tuple shape viem needs for the forwarder's `verify` / `execute` arguments. */
export function toForwardRequestArgs(request: RelayForwardRequest) {
  return {
    from: request.from,
    to: request.to,
    value: BigInt(request.value),
    gas: BigInt(request.gas),
    deadline: request.deadline,
    data: request.data,
    signature: request.signature,
  } as const;
}

function invalid(error: string): RelayPayloadResult {
  return { ok: false, code: 'INVALID_REQUEST', error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Accepts only a canonical non-negative decimal string, so "0x10" / "1e9" / "-1" are out. */
export function parseUintString(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
    return null;
  }
  return BigInt(value);
}
