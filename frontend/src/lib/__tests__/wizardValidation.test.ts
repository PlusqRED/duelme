import { describe, it, expect } from 'vitest';
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

  it('rejects amount below MIN_WAGER (3 USDT)', () => {
    expect(isWagerStepValid({ amount: '2' })).toBe(false);
  });

  it('accepts amount equal to MIN_WAGER', () => {
    expect(isWagerStepValid({ amount: '3' })).toBe(true);
  });

  it('accepts amount above MIN_WAGER', () => {
    expect(isWagerStepValid({ amount: '50' })).toBe(true);
  });

  it('rejects non-numeric input', () => {
    expect(isWagerStepValid({ amount: 'abc' })).toBe(false);
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
