const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export interface FaucetClaimResponse {
  walletAddress: string;
  ethTxHash: string;
  usdtTxHash: string;
  createdAt: string | null;
}

export type FaucetClaimErrorCode =
  | 'already-claimed'
  | 'disabled'
  | 'execution-failed'
  | 'unauthorized'
  | 'unknown';

export class FaucetClaimError extends Error {
  readonly code: FaucetClaimErrorCode;

  constructor(code: FaucetClaimErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function mapStatusToCode(status: number): FaucetClaimErrorCode {
  switch (status) {
    case 401: return 'unauthorized';
    case 409: return 'already-claimed';
    case 502: return 'execution-failed';
    case 503: return 'disabled';
    default:  return 'unknown';
  }
}

export async function claimFaucet(token: string): Promise<FaucetClaimResponse> {
  const res = await fetch(`${API_BASE}/faucet/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const code = mapStatusToCode(res.status);
    let message = `Faucet request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // body not JSON — keep the generic message
    }
    throw new FaucetClaimError(code, message);
  }

  return res.json() as Promise<FaucetClaimResponse>;
}

/** What the faucet gives here and whether this wallet has it. Off where the faucet does not run. */
export type FaucetStatus =
  | { enabled: false }
  | { enabled: true; claimed: boolean; chainId: number; usdtAmountRaw: bigint; ethAmountWei: bigint };

const WHOLE_NUMBER = /^\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWholeNumberString(value: unknown): value is string {
  return typeof value === 'string' && WHOLE_NUMBER.test(value);
}

/** The backend's answer as a status, or null when it has another shape. */
export function parseFaucetStatus(body: unknown): FaucetStatus | null {
  if (!isRecord(body) || typeof body.enabled !== 'boolean') {
    return null;
  }
  if (!body.enabled) {
    return { enabled: false };
  }
  const { claimed, chainId, usdtAmountRaw, ethAmountWei } = body;
  if (
    typeof claimed !== 'boolean' ||
    typeof chainId !== 'number' ||
    !Number.isSafeInteger(chainId) ||
    !isWholeNumberString(usdtAmountRaw) ||
    !isWholeNumberString(ethAmountWei)
  ) {
    return null;
  }
  return { enabled: true, claimed, chainId, usdtAmountRaw: BigInt(usdtAmountRaw), ethAmountWei: BigInt(ethAmountWei) };
}

export async function getFaucetStatus(token: string): Promise<FaucetStatus> {
  const res = await fetch(`${API_BASE}/faucet/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Faucet status request failed (${res.status})`);
  }
  const status = parseFaucetStatus(await res.json());
  if (!status) {
    throw new Error('Faucet status came back in a shape this app does not know');
  }
  return status;
}

/** What the faucet offers on one network: nothing, a claim to make, or a claim already made. */
export type FaucetOffer =
  | { kind: 'none' }
  | { kind: 'ready' | 'claimed'; usdtAmountRaw: bigint; ethAmountWei: bigint };

/** The faucet gives on the one network its backend signs on, and only while it runs. */
export function faucetOffer(status: FaucetStatus | undefined, chainId: number): FaucetOffer {
  if (!status?.enabled || status.chainId !== chainId) {
    return { kind: 'none' };
  }
  return {
    kind: status.claimed ? 'claimed' : 'ready',
    usdtAmountRaw: status.usdtAmountRaw,
    ethAmountWei: status.ethAmountWei,
  };
}

/** A claim the wallet menu follows until its USDT shows up in the balance it was sent to. */
export interface FaucetFollow {
  chainId: number;
  /** The network's USDT when the claim went out. */
  usdtBefore: bigint;
}

/**
 * The faucet's flask on one network: hidden where the faucet gives nothing, ready, asking while the
 * claim is answered, sent until the USDT lands, landed the moment it does, and claimed after.
 */
export type FlaskPhase = 'hidden' | 'ready' | 'asking' | 'sent' | 'landed' | 'claimed';

export function flaskPhase(
  offer: FaucetOffer,
  isClaiming: boolean,
  follow: FaucetFollow | null,
  chainId: number,
  usdtRaw: bigint | null
): FlaskPhase {
  if (offer.kind === 'none') {
    return 'hidden';
  }
  if (isClaiming) {
    return 'asking';
  }
  if (follow?.chainId === chainId) {
    return usdtRaw !== null && usdtRaw > follow.usdtBefore ? 'landed' : 'sent';
  }
  return offer.kind === 'claimed' ? 'claimed' : 'ready';
}
