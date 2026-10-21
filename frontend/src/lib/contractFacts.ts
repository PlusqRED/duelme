/**
 * What the landing says about how DuelMe's contract is tested, in one place. The test count is
 * every `test*` and `invariant*` function in `contracts/test/*.t.sol`, which a test keeps true;
 * the coverage is DuelMe.sol's line coverage from `forge coverage --profile coverage`, measured
 * on the date beside it, and is measured again when the contract's tests change much.
 */
export const CONTRACT_TESTS = 294;

export const contractCoverage = { percent: 94.9, measuredOn: '2026-10-19' } as const;
