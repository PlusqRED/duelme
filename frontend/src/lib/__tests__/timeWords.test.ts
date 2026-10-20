import { describe, expect, it } from 'vitest';
import { translator } from '@/i18n/translate';
import { countdownClock, daysAgoWords, durationWords } from '@/lib/timeWords';

const en = translator('en').plural;
const ru = translator('ru').plural;
const NOW = new Date('2026-10-19T12:00:00Z');

describe('durationWords', () => {
  it('says whole hours in hours', () => {
    expect(durationWords(3600, en)).toBe('1\u00a0hour');
    expect(durationWords(7200, en)).toBe('2\u00a0hours');
  });

  it('agrees with the number in Russian', () => {
    expect(durationWords(3600, ru)).toBe('1\u00a0час');
    expect(durationWords(3 * 3600, ru)).toBe('3\u00a0часа');
    expect(durationWords(5 * 3600, ru)).toBe('5\u00a0часов');
  });

  it('says a time that is not whole hours in minutes', () => {
    expect(durationWords(5400, en)).toBe('90\u00a0minutes');
    expect(durationWords(1800, ru)).toBe('30\u00a0минут');
  });
});

describe('countdownClock', () => {
  it('shows minutes and seconds within the hour', () => {
    expect(countdownClock(42 * 60 + 5)).toBe('42:05');
    expect(countdownClock(59)).toBe('0:59');
  });

  it('adds the hours past an hour', () => {
    expect(countdownClock(3600 + 2 * 60 + 5)).toBe('1:02:05');
  });

  it('stops at zero and drops part seconds', () => {
    expect(countdownClock(-30)).toBe('0:00');
    expect(countdownClock(61.9)).toBe('1:01');
  });
});

describe('daysAgoWords', () => {
  it('says today for the same UTC day, however early', () => {
    expect(daysAgoWords(new Date('2026-10-19T00:00:01Z'), NOW, translator('en'))).toBe('today');
  });

  it('says yesterday for the UTC day before, however late', () => {
    expect(daysAgoWords(new Date('2026-10-18T23:59:59Z'), NOW, translator('ru'))).toBe('вчера');
  });

  it('counts older days, agreeing with the number', () => {
    expect(daysAgoWords(new Date('2026-10-14T09:00:00Z'), NOW, translator('en'))).toBe('5\u00a0days ago');
    expect(daysAgoWords(new Date('2026-10-17T09:00:00Z'), NOW, translator('ru'))).toBe('2\u00a0дня назад');
  });

  it('says today for a moment later than now, as a clock a little behind would give', () => {
    expect(daysAgoWords(new Date('2026-10-20T01:00:00Z'), NOW, translator('en'))).toBe('today');
  });
});
