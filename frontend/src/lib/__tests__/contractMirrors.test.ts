import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { duelMeAbi, DuelState } from '@/lib/contracts';

/**
 * `duelMeAbi` and `DuelState` are hand-made mirrors of the contract, in the same sense
 * `constants.ts` mirrors the broadcast artifact — and a wrong entry here does not fail to
 * compile. It encodes calldata against a selector that does not exist, or reads `Resolved` as
 * `Refunded`, and surfaces as an unexplained revert or a wrong badge.
 *
 * The ABI half needs `forge build` to have run: `contracts/out/` is build output and is not
 * committed, so the check skips rather than failing where the artifact is absent. The enum half
 * needs nothing — it is pinned against the same table as `testDuelStateNumbering` in
 * DuelMe.t.sol, so a renumber on either side fails on the other.
 */
const ARTIFACT = join(__dirname, '../../../..', 'contracts/out/DuelMe.sol/DuelMe.json');

describe('duelMeAbi mirrors the compiled contract', () => {
  const hasArtifact = existsSync(ARTIFACT);

  it.skipIf(!hasArtifact)('matches contracts/out/DuelMe.sol/DuelMe.json entry for entry', () => {
    const artifact = JSON.parse(readFileSync(ARTIFACT, 'utf8')) as { abi: unknown[] };

    // Compared as deeply canonicalised JSON: key order and entry order must not make a real
    // difference pass, but nothing nested may be dropped either. Passing the entry's own keys to
    // `JSON.stringify` as a replacer array looks equivalent and is not — the filter applies at
    // every level of nesting, so tuple `components`, `internalType` and an event input's
    // `indexed` flag were never compared at all. Array order is preserved on purpose: `inputs`,
    // `outputs` and `components` are positional.
    const canonical = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        return value.map(canonical);
      }
      if (value !== null && typeof value === 'object') {
        const entry = value as Record<string, unknown>;
        return Object.fromEntries(Object.keys(entry).sort().map((key) => [key, canonical(entry[key])]));
      }
      return value;
    };

    const normalise = (entries: readonly unknown[]) =>
      entries.map((entry) => JSON.stringify(canonical(entry))).sort();

    expect(normalise(duelMeAbi)).toEqual(normalise(artifact.abi));
  });

  it('is present even when the artifact is not, so the skip above is visible', () => {
    expect(duelMeAbi.length).toBeGreaterThan(0);
  });
});

describe('DuelState mirrors the contract enum', () => {
  it('numbers every state the way DuelMe.sol does', () => {
    // Nonexistent holds zero on purpose: an id nobody issued reads back as a zeroed struct, and
    // while Created held that value such a slot passed for a duel waiting for an opponent.
    expect({
      Nonexistent: DuelState.Nonexistent,
      Created: DuelState.Created,
      Funded: DuelState.Funded,
      WinnerClaimed: DuelState.WinnerClaimed,
      Resolved: DuelState.Resolved,
      Refunded: DuelState.Refunded,
      Cancelled: DuelState.Cancelled,
      Declined: DuelState.Declined,
      Disputed: DuelState.Disputed,
      MutualCancelRequested: DuelState.MutualCancelRequested,
      MutuallyCancelled: DuelState.MutuallyCancelled,
    }).toEqual({
      Nonexistent: 0,
      Created: 1,
      Funded: 2,
      WinnerClaimed: 3,
      Resolved: 4,
      Refunded: 5,
      Cancelled: 6,
      Declined: 7,
      Disputed: 8,
      MutualCancelRequested: 9,
      MutuallyCancelled: 10,
    });
  });
});
