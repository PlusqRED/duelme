import { describe, expect, it } from 'vitest';
import { gameInitials } from '@/lib/gameTile';

describe('gameInitials', () => {
  it.each([
    ['CS2', 'CS2'],
    ['EA FC 25', 'EA'],
    ['PUBG Mobile', 'PM'],
    ['Valorant', 'VA'],
    ['Dota 2', 'D2'],
    ['League of Legends', 'LO'],
    ['  rocket   league ', 'RL'],
  ])('shows %s as %s', (name, initials) => {
    expect(gameInitials(name)).toBe(initials);
  });

  it('keeps a character outside the basic plane whole', () => {
    expect([gameInitials('🔥 Fire Arena'), gameInitials('𝕏Game')]).toEqual(['🔥F', '𝕏G']);
  });

  it('shows nothing for a name of blanks', () => {
    expect(gameInitials('   ')).toBe('');
  });
});
