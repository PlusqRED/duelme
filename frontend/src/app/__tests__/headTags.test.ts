import { describe, expect, it } from 'vitest';
import { sourceFiles } from '@/lib/__tests__/helpers/sourceFiles';

const tsxFiles = sourceFiles(['.tsx']);
const appFiles = tsxFiles.filter((file) => file.path.startsWith('app/'));
const pages = appFiles.filter((file) => file.path.endsWith('/page.tsx') || file.path === 'app/page.tsx');
const layouts = appFiles.filter((file) => file.path.endsWith('/layout.tsx'));

describe('head tags', () => {
  it('finds the pages', () => {
    expect(pages.map((file) => file.path)).toContain('app/games/page.tsx');
  });

  it('has every page set its own, in its language', () => {
    expect(pages.filter((file) => !file.text.includes('pageMetadata(')).map((file) => file.path)).toEqual([]);
  });

  it('leaves the tags that name one page out of every layout', () => {
    const naming = /\b(openGraph|alternates|robots|twitter)\s*:/;

    expect(layouts.filter((file) => naming.test(file.text)).map((file) => file.path)).toEqual([]);
  });

  it('gives the home page the site’s name, which Google reads there only', () => {
    // A second WebSite block on the home page, from a layout or a part, leaves Google two to choose from.
    const naming = tsxFiles.filter((file) => file.text.includes('websiteSchema(')).map((file) => file.path);

    expect(naming).toEqual(['app/page.tsx']);
  });
});
