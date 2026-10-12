import { beforeEach, describe, expect, it } from 'vitest';
import type { Hex } from 'viem';
import {
  SIGNER_HOLD_MS,
  holdSigner,
  refuseWhileHeld,
  releaseSigner,
  resetSignerHolds,
} from '@/lib/relayerSignerHold';

const SIGNER = '0x328809Bc894f92807417D2dAD6b7C998c1aFdac6';
const FIRST: Hex = `0x${'01'.repeat(32)}`;
const SECOND: Hex = `0x${'02'.repeat(32)}`;

beforeEach(() => {
  resetSignerHolds();
});

describe('refuseWhileHeld', () => {
  it('holds a signer from the send until that transaction releases them', () => {
    expect(refuseWhileHeld(SIGNER, 0)).toBeNull();

    holdSigner(SIGNER, FIRST, 0);

    expect(refuseWhileHeld(SIGNER.toLowerCase(), 1)).toMatchObject({ code: 'RELAY_PENDING', status: 409 });
    expect(refuseWhileHeld('0x00000000000000000000000000000000000000e1', 1)).toBeNull();

    releaseSigner(SIGNER, FIRST);

    expect(refuseWhileHeld(SIGNER, 1)).toBeNull();
  });

  it('lets a hold expire when no receipt ever releases it', () => {
    holdSigner(SIGNER, FIRST, 0);

    expect(refuseWhileHeld(SIGNER, SIGNER_HOLD_MS - 1)).not.toBeNull();
    expect(refuseWhileHeld(SIGNER, SIGNER_HOLD_MS)).toBeNull();
  });

  it('ignores a late release from an older transaction', () => {
    holdSigner(SIGNER, FIRST, 0);
    holdSigner(SIGNER, SECOND, SIGNER_HOLD_MS);

    releaseSigner(SIGNER, FIRST);

    expect(refuseWhileHeld(SIGNER, SIGNER_HOLD_MS + 1)).not.toBeNull();
  });
});
