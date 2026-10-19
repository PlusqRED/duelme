import { describe, expect, it } from 'vitest';
import { NAV_LINKS, isInSection } from '@/lib/navigation';

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
