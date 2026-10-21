import { describe, expect, it } from 'vitest';
import { LANDING_SECTIONS, NAV_LINKS, isInSection, isPlainClick } from '@/lib/navigation';

describe('isInSection', () => {
  it('counts the section’s own page', () => {
    expect(isInSection('/games', '/games')).toBe(true);
  });

  it('counts a page under the section', () => {
    expect(isInSection('/games/counter-strike-2', '/games')).toBe(true);
  });

  it('does not count a page that only starts with the same letters', () => {
    expect(isInSection('/gameshow', '/games')).toBe(false);
  });

  it('does not count the home page in any section', () => {
    expect(NAV_LINKS.some((link) => isInSection('/', link.href))).toBe(false);
  });
});

describe('NAV_LINKS', () => {
  it('lists the sections in the top bar’s order, with My duels for a signed-in player only', () => {
    expect(NAV_LINKS.map((link) => [link.href, link.signedInOnly])).toEqual([
      ['/duels/public', false],
      ['/duels/recent', false],
      ['/games', false],
      ['/dashboard', true],
    ]);
  });
});

describe('LANDING_SECTIONS', () => {
  it('lists the landing’s sections in the order the page has them', () => {
    expect(LANDING_SECTIONS.map((link) => link.section)).toEqual(['public-duels', 'recent-duels', 'demo', 'safety']);
  });
});

describe('isPlainClick', () => {
  const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

  it('takes a plain click as following the link here', () => {
    expect(isPlainClick(plain)).toBe(true);
  });

  it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])(
    'takes %o as opening the link elsewhere',
    (keys) => {
      expect(isPlainClick({ ...plain, ...keys })).toBe(false);
    }
  );
});
