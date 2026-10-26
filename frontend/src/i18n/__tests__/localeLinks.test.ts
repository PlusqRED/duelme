import { describe, expect, it } from 'vitest';
import { sourceFiles } from '@/lib/__tests__/helpers/sourceFiles';

const files = sourceFiles(['.ts', '.tsx']);

/** The files whose text matches, so a failure names them. */
function filesMatching(pattern: RegExp, allowed: readonly string[] = []): string[] {
  return files.filter((file) => !allowed.includes(file.path) && pattern.test(file.text)).map((file) => file.path);
}

describe('links stay in the page’s language', () => {
  it('reach next/link only through LocaleLink, which adds the language’s prefix', () => {
    expect(filesMatching(/from 'next\/link'/, ['components/ui/LocaleLink.tsx'])).toEqual([]);
  });

  it('never move the router to a bare page address', () => {
    expect(filesMatching(/router\.(push|replace)\(\s*['`]\//)).toEqual([]);
  });

  it('never redirect on the server to a bare page address', () => {
    expect(filesMatching(/\bredirect\(\s*['`]\//)).toEqual([]);
  });

  it('never build a full address to a page by hand: localePath gives the language’s one', () => {
    expect(filesMatching(/window\.location\.origin\}\//)).toEqual([]);
  });
});
