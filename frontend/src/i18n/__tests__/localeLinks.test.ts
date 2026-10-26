import { describe, expect, it } from 'vitest';
import { sourceFiles } from '@/lib/__tests__/helpers/sourceFiles';

const files = sourceFiles(['.ts', '.tsx']);

/** The files whose text matches, so a failure names them. */
function filesMatching(pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(file.text)).map((file) => file.path);
}

/** An import of `next/link` outside LocaleLink is an ESLint error (`eslint.config.mjs`). */
describe('links stay in the page’s language', () => {
  it('never move the router to a bare page address', () => {
    expect(filesMatching(/router\.(push|replace)\(\s*['`]\//)).toEqual([]);
  });

  it('never redirect on the server to a bare page address', () => {
    expect(filesMatching(/\b(?:redirect|permanentRedirect)\(\s*['`]\//)).toEqual([]);
  });

  it('never link a page with a plain anchor, which keeps no language', () => {
    expect(filesMatching(/<a\b[^>]*\bhref=\{?\s*['"`]\/(?!\/)/)).toEqual([]);
  });

  it('never build a full address to a page by hand: localePath gives the language’s one', () => {
    expect(filesMatching(/window\.location\.origin\}\//)).toEqual([]);
  });
});
