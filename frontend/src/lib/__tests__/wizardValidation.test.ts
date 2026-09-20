import { afterEach, describe, it, expect } from 'vitest';
import { MIN_WAGER } from '@/lib/constants';
import { resetContractConfig, setContractConfig } from '@/lib/contractConfig';
import {
  isGameStepValid,
  isReviewStepValid,
  isTypeMessageStepValid,
  isWagerStepValid,
} from '../wizardValidation';

describe('isGameStepValid', () => {
  it('rejects empty slug', () => {
    expect(isGameStepValid({ gameSlug: '' })).toBe(false);
  });

  it('accepts a non-empty slug', () => {
    expect(isGameStepValid({ gameSlug: 'cs2' })).toBe(true);
  });
});

describe('isWagerStepValid', () => {
  it('rejects empty input', () => {
    expect(isWagerStepValid({ amount: '' })).toBe(false);
  });

  it('rejects amount below MIN_WAGER', () => {
    expect(isWagerStepValid({ amount: String(MIN_WAGER / 2) })).toBe(false);
  });

  it('accepts amount equal to MIN_WAGER', () => {
    expect(isWagerStepValid({ amount: String(MIN_WAGER) })).toBe(true);
  });

  it('accepts amount above MIN_WAGER', () => {
    expect(isWagerStepValid({ amount: '50' })).toBe(true);
  });

  it('rejects non-numeric input', () => {
    expect(isWagerStepValid({ amount: 'abc' })).toBe(false);
  });
});

describe('isWagerStepValid with on-chain config', () => {
  afterEach(() => {
    resetContractConfig();
  });

  it('follows a raised on-chain minWager', () => {
    setContractConfig({ minWager: 5 });
    expect(isWagerStepValid({ amount: '3' })).toBe(false);
    expect(isWagerStepValid({ amount: '5' })).toBe(true);
  });

  it('follows a lowered on-chain minWager', () => {
    setContractConfig({ minWager: 0.1 });
    expect(isWagerStepValid({ amount: '0.1' })).toBe(true);
  });
});

describe('isTypeMessageStepValid with on-chain config', () => {
  afterEach(() => {
    resetContractConfig();
  });

  it('follows a raised on-chain message limit', () => {
    setContractConfig({ maxMessageCharacters: 64 });
    expect(isTypeMessageStepValid({ message: 'x'.repeat(64) })).toBe(true);
    expect(isTypeMessageStepValid({ message: 'x'.repeat(65) })).toBe(false);
  });

  it('still enforces the UTF-8 byte limit when only codepoints are raised', () => {
    setContractConfig({ maxMessageCharacters: 64 });
    // 40 four-byte emoji = 40 code points (<= 64) but 160 bytes (> 128)
    expect(isTypeMessageStepValid({ message: '\u{1F600}'.repeat(40) })).toBe(false);
    setContractConfig({ maxMessageBytes: 256 });
    expect(isTypeMessageStepValid({ message: '\u{1F600}'.repeat(40) })).toBe(true);
  });
});

describe('isTypeMessageStepValid', () => {
  it('accepts empty message', () => {
    expect(isTypeMessageStepValid({ message: '' })).toBe(true);
  });

  it('accepts message at the 32-character limit', () => {
    expect(isTypeMessageStepValid({ message: 'x'.repeat(32) })).toBe(true);
  });

  it('rejects messages longer than 32 characters', () => {
    expect(isTypeMessageStepValid({ message: 'x'.repeat(33) })).toBe(false);
  });
});

describe('isReviewStepValid', () => {
  it('requires all prior steps to pass', () => {
    expect(
      isReviewStepValid({
        gameSlug: 'cs2',
        gameName: 'CS2',
        amount: '5',
        message: '',
        isPublic: false,
      })
    ).toBe(true);
  });

  it('fails when game is missing', () => {
    expect(
      isReviewStepValid({
        gameSlug: '',
        gameName: '',
        amount: '5',
        message: '',
        isPublic: false,
      })
    ).toBe(false);
  });
});
