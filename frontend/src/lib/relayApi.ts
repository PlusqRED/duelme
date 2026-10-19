import { isHash, type Hex } from 'viem';
import {
  isRecord,
  isRelayErrorCode,
  type RelayErrorCode,
  type RelayForwardRequest,
} from '@/lib/relayRequest';

const RELAY_ENDPOINT = '/api/relay';

/**
 * Ceiling on one relayed write, every post of it included. The server answers only once the
 * transaction is mined (or its own 30s receipt wait gives up) and requests queue behind one
 * another, so this has to be generous — but never unbounded: the guided flow disables its close
 * button while a write is in flight, so a stalled connection would otherwise trap the player in
 * the dialog.
 */
const RELAY_TIMEOUT_MS = 120_000;

/**
 * Pauses before each repost of one signed request, all within that one deadline, while its answer
 * keeps getting lost on the way back. They grow so that the later posts outlast a phone switching
 * networks. Posting the same body again is safe: the relayer gives every copy of a signed request
 * the first one's outcome (relayerDedup), so a repeat joins a relay still under way or gets the
 * hash of one already done, and never sends it twice. A request signed afresh would be a new one,
 * and a second duel if the first post went through.
 */
const RELAY_REPOST_DELAYS_MS = [2_000, 10_000, 30_000];

export class RelayRequestError extends Error {
  readonly code: RelayErrorCode;

  constructor(code: RelayErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = 'RelayRequestError';
  }
}

/**
 * Hands a signed forward request to the relayer. Resolves with the transaction hash once
 * the relayer has it on-chain; throws RelayRequestError with the server's code so callers
 * can tell "your allowance is spent" apart from "that action would revert".
 */
export async function submitRelayRequest(chainId: number, request: RelayForwardRequest): Promise<Hex> {
  const answer = await postUntilAnswered(JSON.stringify({ chainId, request }));
  const fields = isRecord(answer.body) ? answer.body : {};

  if (!answer.ok) {
    // A code this bundle does not know — a tab left open across a deploy — reads as
    // "unavailable", the one answer every caller already handles.
    const code = isRelayErrorCode(fields.code) ? fields.code : 'RELAYER_UNAVAILABLE';
    const message =
      typeof fields.error === 'string' ? fields.error : `Relayer refused the request (HTTP ${answer.status}).`;
    throw new RelayRequestError(code, message);
  }

  // A repeat of a payload the relayer already sent answers with that transaction's hash,
  // so it lands here exactly like the first post did.
  if (typeof fields.hash !== 'string' || !isHash(fields.hash)) {
    throw new RelayRequestError('RELAYER_UNAVAILABLE', 'Relayer returned no transaction hash.');
  }

  return fields.hash;
}

interface RelayAnswer {
  ok: boolean;
  status: number;
  body: unknown;
}

/** Posts the body until the relayer answers at all. Any answer, a refusal included, is final. */
async function postUntilAnswered(body: string): Promise<RelayAnswer> {
  const deadline = AbortSignal.timeout(RELAY_TIMEOUT_MS);

  for (let repost = 0; ; repost++) {
    try {
      return await post(body, deadline);
    } catch (error) {
      if (deadline.aborted || repost === RELAY_REPOST_DELAYS_MS.length) {
        throw new RelayRequestError(
          'RELAYER_UNAVAILABLE',
          deadline.aborted ? 'The relayer did not answer in time.' : 'No answer came back from the relayer.',
          { cause: error }
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, RELAY_REPOST_DELAYS_MS[repost]));
  }
}

/** One post. Throws when no answer came back: no response at all, or a success without its body. */
async function post(body: string, deadline: AbortSignal): Promise<RelayAnswer> {
  const response = await fetch(RELAY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: deadline,
  });

  // Every success carries the hash in its body, so one whose body is lost is a lost answer.
  // A refusal's body can be anything, a proxy's error page included, and its status is enough.
  const answer: unknown = response.ok ? await response.json() : await response.json().catch(() => null);

  return { ok: response.ok, status: response.status, body: answer };
}
