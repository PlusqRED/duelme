import { describe, expect, it } from 'vitest';
import { easings } from '@/lib/easings';
import { themeTokens } from '@/lib/__tests__/helpers/sourceFiles';

const tokens = themeTokens('ease');

describe('easings', () => {
  it.each(Object.entries(easings))('copies the theme token for %s', (name, curve) => {
    expect(tokens.get(name)).toBe(curve);
  });
});
