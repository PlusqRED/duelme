import { describe, it, expect } from 'vitest';
import { MESSAGE_PLACEHOLDER_KEYS } from '@/components/duel/wizard/TypeMessageStep';
import { translations } from '@/i18n/translations';

describe('MESSAGE_PLACEHOLDER_KEYS', () => {
  it('has the expected pool size', () => {
    expect(MESSAGE_PLACEHOLDER_KEYS).toHaveLength(14);
  });

  it('has no duplicate keys', () => {
    expect(new Set(MESSAGE_PLACEHOLDER_KEYS).size).toBe(MESSAGE_PLACEHOLDER_KEYS.length);
  });

  it.each(['en', 'ru'] as const)('has a non-empty %s string for every key', (lang) => {
    for (const key of MESSAGE_PLACEHOLDER_KEYS) {
      expect(translations[lang][key]).toBeTypeOf('string');
      expect(translations[lang][key].trim().length).toBeGreaterThan(0);
    }
  });
});
