import type { GameCategory } from '@/lib/game';

/**
 * What a game's tile shows: the acronym a name starts with («CS2», «PUBG Mobile» → «PUBG» is four
 * letters, so «PM»), else the first two letters of a one-word name, else the first letters of its
 * first two words.
 */
export function gameInitials(name: string): string {
  const [first, second] = name.trim().split(/\s+/).map(lettersOf);
  if (!first?.length) return '';
  if (/^[A-Z0-9]{2,3}$/.test(first.join(''))) return first.join('');
  return (second ? [first[0], second[0]] : first.slice(0, 2)).map(capital).join('');
}

// By what reads as one character, so a name that starts with an emoji, a flag or a family of
// people keeps it whole. A browser without `Intl.Segmenter` (Firefox before 125) splits by code
// point instead, which still keeps a plain emoji whole; constructing one there would throw.
const graphemes =
  typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

function lettersOf(word: string): string[] {
  return graphemes ? Array.from(graphemes.segment(word), ({ segment }) => segment) : Array.from(word);
}

/** A letter in upper case, unless that makes it two: «ß» would turn into «SS». */
function capital(letter: string): string {
  const upper = letter.toUpperCase();
  return upper.length === letter.length ? upper : letter;
}

/**
 * Each category's tile, as classes, and its ink as a colour for what a game marks beyond its tile:
 * a picked game's edge, the bar of its share.
 */
export const GAME_TONES: Record<GameCategory, { tile: string; ink: string }> = {
  FPS: { tile: 'bg-game-fps text-game-fps-ink', ink: 'var(--color-game-fps-ink)' },
  MOBA: { tile: 'bg-game-moba text-game-moba-ink', ink: 'var(--color-game-moba-ink)' },
  SPORT: { tile: 'bg-game-sport text-game-sport-ink', ink: 'var(--color-game-sport-ink)' },
  STRATEGY: { tile: 'bg-game-strategy text-game-strategy-ink', ink: 'var(--color-game-strategy-ink)' },
  FIGHTING: { tile: 'bg-game-fighting text-game-fighting-ink', ink: 'var(--color-game-fighting-ink)' },
  RACING: { tile: 'bg-game-racing text-game-racing-ink', ink: 'var(--color-game-racing-ink)' },
  CARD: { tile: 'bg-game-card text-game-card-ink', ink: 'var(--color-game-card-ink)' },
  OTHER: { tile: 'bg-game-other text-game-other-ink', ink: 'var(--color-game-other-ink)' },
};

/** A game's ink, from its category's tile; the page's own without a category. */
export function gameInk(category: GameCategory | null | undefined): string {
  return category ? GAME_TONES[category].ink : 'var(--color-ink)';
}
