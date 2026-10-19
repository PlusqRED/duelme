import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { brandColors } from '@/lib/brandColors';

const theme = readFileSync(join(__dirname, '../../styles/theme.css'), 'utf8');

function themeToken(name: string): string | undefined {
  const kebab = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return theme.match(new RegExp(`--color-${kebab}:\\s*(#[0-9a-f]{6});`))?.[1];
}

describe('brandColors', () => {
  it.each(Object.entries(brandColors))('copies the theme token for %s', (name, hex) => {
    expect(themeToken(name)).toBe(hex);
  });
});
