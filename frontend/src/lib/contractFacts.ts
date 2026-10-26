import type { Translator } from '@/i18n/translate';
import type { Language, PluralKey } from '@/i18n/translations';
import { formatCount } from '@/lib/utils';

/**
 * What the site says about DuelMe's contract, in one place. The test count is
 * every `test*` and `invariant*` function in `contracts/test/*.t.sol`, which a test keeps true;
 * the coverage is DuelMe.sol's line coverage from `forge coverage --profile coverage`, measured
 * on the date beside it, and is measured again when the contract's tests change much.
 */
export const CONTRACT_TESTS = 294;

export const contractCoverage = { percent: 94.9, measuredOn: '2026-10-19' } as const;

/**
 * The least time between announcing the contract's emergency withdrawal, its one way to move money
 * that players have not settled, and carrying it out: `MIN_EMERGENCY_DELAY`, which a test keeps true.
 */
export const EMERGENCY_DELAY_DAYS = 30;

function counted(count: number, key: PluralKey, plural: Translator['plural'], language: Language): string {
  return `${formatCount(count, language)} ${plural(key, count)}`;
}

/** The test count in the reader's words, the number written their way: "294 tests", «294 теста». */
export function contractTestsLabel(plural: Translator['plural'], language: Language): string {
  return counted(CONTRACT_TESTS, 'trust.tests', plural, language);
}

/** The emergency delay in the reader's words: "30 days", «30 дней». */
export function emergencyDelayLabel(plural: Translator['plural'], language: Language): string {
  return counted(EMERGENCY_DELAY_DAYS, 'time.days', plural, language);
}
