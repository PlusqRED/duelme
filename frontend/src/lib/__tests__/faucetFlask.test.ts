import { describe, expect, it } from 'vitest';
import type { FaucetOffer } from '@/lib/faucetApi';
import { flaskPhase } from '@/lib/faucetFlask';

describe('flaskPhase', () => {
  const CHAIN = 421614;
  const ready: FaucetOffer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1n };
  const claimed: FaucetOffer = { ...ready, kind: 'claimed' };

  it('hides the flask where the faucet gives nothing', () => {
    expect(flaskPhase({ kind: 'none' }, false, null, CHAIN, 0n)).toBe('hidden');
  });

  it('offers the claim the wallet has not made', () => {
    expect(flaskPhase(ready, false, null, CHAIN, 0n)).toBe('ready');
  });

  it('asks while the faucet answers', () => {
    expect(flaskPhase(ready, true, null, CHAIN, 0n)).toBe('asking');
  });

  it('keeps the money on its way after the faucet said yes, though the claim already counts as made', () => {
    expect(flaskPhase(claimed, false, { chainId: CHAIN, usdtBefore: 5n }, CHAIN, 5n)).toBe('sent');
  });

  it('lands the money once the balance grows past what it was when the claim went out', () => {
    expect(flaskPhase(claimed, false, { chainId: CHAIN, usdtBefore: 5n }, CHAIN, 100_000_005n)).toBe('landed');
  });

  it('waits on a balance that is not known yet', () => {
    expect(flaskPhase(claimed, false, { chainId: CHAIN, usdtBefore: 5n }, CHAIN, null)).toBe('sent');
  });

  it('does not follow a claim made on another network', () => {
    expect(flaskPhase(claimed, false, { chainId: 42161, usdtBefore: 0n }, CHAIN, 9n)).toBe('claimed');
  });

  it('says the claim is made once it is no longer followed', () => {
    expect(flaskPhase(claimed, false, null, CHAIN, 0n)).toBe('claimed');
  });
});
