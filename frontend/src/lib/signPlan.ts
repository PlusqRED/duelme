import type { WriteRoute } from '@/lib/writeRoute';

/** What the wallet is asked for: the permit for the stake, the approve, or the move itself. */
export type SignPart = 'permit' | 'approve' | 'move';

/** A signature DuelMe sends on, or a transaction the wallet sends and pays for. */
export type SignKind = 'signature' | 'transaction';

/** Which signature the wallet is asked for on the relayed path: the stake's permit, or the request DuelMe sends. */
export type SigningPhase = 'permit' | 'request';

export interface SignStep {
  part: SignPart;
  kind: SignKind;
}

/**
 * What a duel action asks of the wallet, in the order the wallet will ask it. Relayed, a stake is
 * funded by a permit signed for exactly the stake and the move goes out as a signed request: two
 * signatures for creating or joining, one for anything else. Self-paid, the wallet sends each
 * transaction, and a stake needs an approve first only while the allowance is short of it.
 */
export function signPlan(write: { route: WriteRoute; funds: boolean; needsApproval: boolean }): SignStep[] {
  if (write.route === 'relay') {
    return write.funds
      ? [{ part: 'permit', kind: 'signature' }, { part: 'move', kind: 'signature' }]
      : [{ part: 'move', kind: 'signature' }];
  }
  const approve: SignStep[] = write.funds && write.needsApproval ? [{ part: 'approve', kind: 'transaction' }] : [];
  return [...approve, { part: 'move', kind: 'transaction' }];
}

