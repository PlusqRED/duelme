import type { Translator } from '@/i18n/translate';
import type { Language } from '@/i18n/translations';
import { formatCount } from '@/lib/utils';

/**
 * What the landing says about how DuelMe's contract is tested, in one place. The test count is
 * every `test*` and `invariant*` function in `contracts/test/*.t.sol`, which a test keeps true;
 * the coverage is DuelMe.sol's line coverage from `forge coverage --profile coverage`, measured
 * on the date beside it, and is measured again when the contract's tests change much.
 */
export const CONTRACT_TESTS = 294;

export const contractCoverage = { percent: 94.9, measuredOn: '2026-10-19' } as const;

/** The test count in the reader's words, the number written their way: "294 tests", «294 теста». */
export function contractTestsLabel(plural: Translator['plural'], language: Language): string {
  return `${formatCount(CONTRACT_TESTS, language)} ${plural('trust.tests', CONTRACT_TESTS)}`;
}
