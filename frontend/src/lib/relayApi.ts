import { isHash, type Hex } from 'viem';
import { isRecord } from '@/lib/parsing';
import type { RelayTransfer } from '@/lib/relayedTransfer';
import {
  isRelayErrorCode,
  type RelayErrorCode,
  type RelayForwardRequest,
} from '@/lib/relayRequest';

const RELAY_ENDPOINT = '/api/relay';
const RELAY_TRANSFER_ENDPOINT = '/api/relay/transfer';

/**
 * Ceiling on one relayed write, every post of it included. The server answers only once the
 * transaction is mined (or its own 30s receipt wait gives up) and requests queue behind one
 * another, so this has to be generous — but never unbounded: the signing window disables its close
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
 * No answer came back for a request the relayer may already have sent, so nobody knows how it
 * ended. Unlike a refusal, it must not be signed afresh: that would be a new request, and a second
 * duel if the first went through.
 */
export class RelayAnswerLostError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RelayAnswerLostError';
  }
}

/**
 * Hands a signed forward request to the relayer. Resolves with the transaction hash once
 * the relayer has it on-chain; throws RelayRequestError with the server's code so callers
 * can tell "your allowance is spent" apart from "that action would revert", and
 * RelayAnswerLostError when no answer came back at all.
 */
export async function submitRelayRequest(chainId: number, request: RelayForwardRequest): Promise<Hex> {
  return relayedHash(await postUntilAnswered(RELAY_ENDPOINT, JSON.stringify({ chainId, request })));
}

/**
 * Hands the day's signed transfer authorization to the relayer, with the same answers and the same
 * reposts as a duel write. A repost is as safe here: the relayer answers every copy with the first
 * one's outcome, and the token spends the day's nonce once whatever happens.
 *
 * But a refusal of a repost says nothing about the post before it, whose answer never came: the
 * rate limit runs before the repeat check, a relayer that restarted forgot the first post and finds
 * the day's nonce spent, by that very post, and the day or the window may have run out meanwhile.
 * So any refusal of a repost is an answer lost, never "nothing was sent": the wallet would pay for
 * the same transfer again.
 */
export async function submitRelayTransfer(chainId: number, transfer: RelayTransfer): Promise<Hex> {
  const answer = await postUntilAnswered(RELAY_TRANSFER_ENDPOINT, JSON.stringify({ chainId, transfer }));
  if (answer.isRepost && !answer.ok) {
    throw new RelayAnswerLostError('An earlier post of this transfer may have gone out.');
  }
  return relayedHash(answer);
}

/** The relayer's answer as the transaction hash, or the error it stands for. */
function relayedHash(answer: RelayAnswer): Hex {
  const fields = isRecord(answer.body) ? answer.body : {};

  if (!answer.ok) {
    const message =
      typeof fields.error === 'string' ? fields.error : `Relayer refused the request (HTTP ${answer.status}).`;
    // A refusal without a code the relay gives is no word from the relay: a proxy's error page while
    // the app restarted mid-request, or a code from a deploy newer than this tab. The request may
    // have gone out, so it reads as an answer lost, never as "nothing was sent".
    if (!isRelayErrorCode(fields.code)) {
      throw new RelayAnswerLostError(message);
    }
    throw new RelayRequestError(fields.code, message);
  }

  // A repeat of a payload the relayer already sent answers with that transaction's hash,
  // so it lands here exactly like the first post did.
  if (typeof fields.hash !== 'string' || !isHash(fields.hash)) {
    throw new RelayAnswerLostError('Relayer returned no transaction hash.');
  }

  return fields.hash;
}

interface RelayAnswer {
  ok: boolean;
  status: number;
  body: unknown;
  /** The answer came to a repost: an earlier post of the same body got none back. */
  isRepost: boolean;
}

/** Posts the body until the relayer answers at all. Any answer, a refusal included, is final. */
async function postUntilAnswered(endpoint: string, body: string): Promise<RelayAnswer> {
  const deadline = AbortSignal.timeout(RELAY_TIMEOUT_MS);

  for (let repost = 0; ; repost++) {
    try {
      return { ...(await post(endpoint, body, deadline)), isRepost: repost > 0 };
    } catch (error) {
      if (deadline.aborted || repost === RELAY_REPOST_DELAYS_MS.length) {
        throw new RelayAnswerLostError(
          deadline.aborted ? 'The relayer did not answer in time.' : 'No answer came back from the relayer.',
          { cause: error }
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, RELAY_REPOST_DELAYS_MS[repost]));
  }
}

/** One post. Throws when no answer came back: no response at all, or a success without its body. */
async function post(endpoint: string, body: string, deadline: AbortSignal): Promise<Omit<RelayAnswer, 'isRepost'>> {
  const response = await fetch(endpoint, {
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
