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
