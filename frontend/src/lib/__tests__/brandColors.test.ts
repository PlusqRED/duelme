import { describe, expect, it } from 'vitest';
import { brandColors } from '@/lib/brandColors';
import { themeTokens } from '@/lib/__tests__/helpers/sourceFiles';

const colours = themeTokens('color');

describe('brandColors', () => {
  it.each(Object.entries(brandColors))('copies the theme token for %s', (name, hex) => {
    expect(colours.get(name.replace(/[A-Z]|\d+/g, (part) => `-${part.toLowerCase()}`))).toBe(hex);
  });
});
