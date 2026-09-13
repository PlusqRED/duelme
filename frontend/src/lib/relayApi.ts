import type { Hex } from 'viem';
import type {
  RelayErrorCode,
  RelayErrorResponse,
  RelayForwardRequest,
  RelayerStatus,
  RelaySuccessResponse,
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

  if (typeof body !== 'object' || body === null) {
    return { available: false, chainId: null };
  }

  const { available, chainId } = body as Partial<RelayerStatus>;

  return {
    available: available === true,
    chainId: typeof chainId === 'number' ? chainId : null,
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

  if (!response.ok) {
    const { code, error } = (body ?? {}) as Partial<RelayErrorResponse>;
    throw new RelayRequestError(
      code ?? 'RELAYER_UNAVAILABLE',
      error ?? `Relayer refused the request (HTTP ${response.status}).`
    );
  }

  const { hash } = (body ?? {}) as Partial<RelaySuccessResponse>;

  if (typeof hash !== 'string' || !hash.startsWith('0x')) {
    throw new RelayRequestError('RELAYER_UNAVAILABLE', 'Relayer returned no transaction hash.');
  }

  return hash as Hex;
}
