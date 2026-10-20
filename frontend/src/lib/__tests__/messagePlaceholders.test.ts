import { describe, expect, it } from 'vitest';
import { translations } from '@/i18n/translations';
import { isDuelMessageValid, normalizeDuelMessage } from '@/lib/duelMessage';

// The message field shows this example when the game has no note of its own, so it must read as a
// message the field would take.
describe('the message example', () => {
  it.each(['en', 'ru'] as const)('fits the contract limits in %s', (language) => {
    // Arrange
    const example = translations[language]['create.message.example'];

    // Act
    const isValid = isDuelMessageValid(normalizeDuelMessage(example));

    // Assert
    expect(isValid).toBe(true);
  });

  it.each(['en', 'ru'] as const)('has no spaces around it in %s', (language) => {
    // Arrange
    const example = translations[language]['create.message.example'];

    // Act
    const normalized = normalizeDuelMessage(example);

    // Assert
    expect(normalized).toBe(example);
  });
});
