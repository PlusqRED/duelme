import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/__tests__/helpers/sourceFiles';

describe('cn', () => {
  it.each([...themeTokens('text').keys()])('keeps the type size text-%s beside a text colour', (size) => {
    expect(cn(`text-${size}`, 'text-ink')).toBe(`text-${size} text-ink`);
  });

  it.each([...themeTokens('font-weight').keys()])('keeps the weight font-%s beside a font family', (weight) => {
    expect(cn(`font-${weight}`, 'font-sans')).toBe(`font-${weight} font-sans`);
  });

  it.each([...themeTokens('shadow').keys()])('keeps the shadow shadow-%s beside a shadow colour', (shadow) => {
    expect(cn(`shadow-${shadow}`, 'shadow-ink/20')).toBe(`shadow-${shadow} shadow-ink/20`);
  });

  it.each([...themeTokens('shadow').keys()])('lets a later shadow replace shadow-%s', (shadow) => {
    expect(cn(`shadow-${shadow}`, 'shadow-lg')).toBe('shadow-lg');
  });

  it.each([...themeTokens('ease').keys()])('lets a later easing replace ease-%s', (ease) => {
    expect(cn(`ease-${ease}`, 'ease-in')).toBe('ease-in');
  });

  it('lets a later type size replace an earlier one', () => {
    expect(cn('text-body', 'text-note')).toBe('text-note');
  });

  it('lets a later colour replace an earlier one', () => {
    expect(cn('bg-ink text-paper', 'bg-sun text-ink')).toBe('bg-sun text-ink');
  });
});
