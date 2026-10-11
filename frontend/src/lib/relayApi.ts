import { isHash, type Hex } from 'viem';
import {
  isRecord,
  isRelayErrorCode,
  type RelayErrorCode,
  type RelayForwardRequest,
  type RelayerStatus,
} from '@/lib/relayRequest';

const RELAY_ENDPOINT = '/api/relay';

/**
 * Ceiling on one relay round trip. The server answers only once the transaction is mined (or
 * its own 30s receipt wait gives up) and requests queue behind one another, so this has to be
 * generous — but never unbounded: the guided flow disables its close button while a write is
 * in flight, so a stalled connection would otherwise trap the player in the dialog.
 */
const RELAY_TIMEOUT_MS = 120_000;

export class RelayRequestError extends Error {
  readonly code: RelayErrorCode;

  constructor(code: RelayErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = 'RelayRequestError';
  }
}

/** Whether this deployment can relay at all, and for which chain. */
export async function fetchRelayerStatus(signal?: AbortSignal): Promise<RelayerStatus> {
  const response = await fetch(RELAY_ENDPOINT, { method: 'GET', signal });

  if (!response.ok) {
    return { available: false, chainId: null };
  }

  const body: unknown = await response.json();

  if (!isRecord(body)) {
    return { available: false, chainId: null };
  }

  return {
    available: body.available === true,
    chainId: typeof body.chainId === 'number' ? body.chainId : null,
  };
}

/**
 * Hands a signed forward request to the relayer. Resolves with the transaction hash once
 * the relayer has it on-chain; throws RelayRequestError with the server's code so callers
 * can tell "your allowance is spent" apart from "that action would revert".
 */
export async function submitRelayRequest(chainId: number, request: RelayForwardRequest): Promise<Hex> {
  let response: Response;

  try {
    response = await fetch(RELAY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId, request }),
      signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    throw new RelayRequestError(
      'RELAYER_UNAVAILABLE',
      timedOut ? 'The relayer did not answer in time.' : 'Could not reach the relayer.',
      { cause: error }
    );
  }

  const body: unknown = await response.json().catch(() => null);
  const fields = isRecord(body) ? body : {};

  if (!response.ok) {
    // A code this bundle does not know — a tab left open across a deploy — reads as
    // "unavailable", the one answer every caller already handles.
    const code = isRelayErrorCode(fields.code) ? fields.code : 'RELAYER_UNAVAILABLE';
    const message =
      typeof fields.error === 'string' ? fields.error : `Relayer refused the request (HTTP ${response.status}).`;
    throw new RelayRequestError(code, message);
  }

  // A repeat of a request the relayer already sent answers with that transaction's hash, so
  // a retry after a dropped connection lands here like the first attempt would have.
  if (typeof fields.hash !== 'string' || !isHash(fields.hash)) {
    throw new RelayRequestError('RELAYER_UNAVAILABLE', 'Relayer returned no transaction hash.');
  }

  return fields.hash;
}
