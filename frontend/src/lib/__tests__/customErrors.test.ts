import { describe, expect, it } from 'vitest';
import { nameCustomErrors, quotesCustomError } from '@/lib/customErrors';

describe('nameCustomErrors', () => {
  it('testNameCustomErrorsNamesTheContractsOwnError', () => {
    const text = 'reverted with the following signature: 0xd93c0665';

    const named = nameCustomErrors(text);

    expect(named).toBe('reverted with the following signature: EnforcedPause');
  });

  it('testNameCustomErrorsNamesATokenErrorAndDropsItsArguments', () => {
    const data = `0xe450d38c${'0'.repeat(192)}`;

    const named = nameCustomErrors(`execution reverted: ${data}`);

    expect(named).toBe('execution reverted: ERC20InsufficientBalance');
  });

  it('testNameCustomErrorsLeavesUnknownDataAsItIs', () => {
    const text = 'reverted with the following signature: 0x12345678';

    const named = nameCustomErrors(text);

    expect(named).toBe(text);
  });
});

describe('quotesCustomError', () => {
  it('testQuotesCustomErrorSeesAKnownSelector', () => {
    const quotes = quotesCustomError('signature: 0xD93C0665');

    expect(quotes).toBe(true);
  });

  it('testQuotesCustomErrorIgnoresPlainText', () => {
    const quotes = quotesCustomError('Duel not in Created state');

    expect(quotes).toBe(false);
  });
});
