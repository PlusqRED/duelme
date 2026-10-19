import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

const theme = readFileSync(join(__dirname, '../../styles/theme.css'), 'utf8');

function themeTokens(namespace: string): string[] {
  return [...theme.matchAll(new RegExp(`--${namespace}-([a-z0-9]+):`, 'g'))].map((match) => match[1]);
}

describe('cn', () => {
  it.each(themeTokens('text'))('keeps the type size text-%s beside a text colour', (size) => {
    expect(cn(`text-${size}`, 'text-ink')).toBe(`text-${size} text-ink`);
  });

  it.each(themeTokens('font-weight'))('keeps the weight font-%s beside a font family', (weight) => {
    expect(cn(`font-${weight}`, 'font-sans')).toBe(`font-${weight} font-sans`);
  });

  it('lets a later type size replace an earlier one', () => {
    expect(cn('text-body', 'text-note')).toBe('text-note');
  });

  it('lets a later colour replace an earlier one', () => {
    expect(cn('bg-ink text-paper', 'bg-sun text-ink')).toBe('bg-sun text-ink');
  });
});
