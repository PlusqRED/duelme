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
// people keeps it whole.
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function lettersOf(word: string): string[] {
  return Array.from(graphemes.segment(word), ({ segment }) => segment);
}

/** A letter in upper case, unless that makes it two: «ß» would turn into «SS». */
function capital(letter: string): string {
  const upper = letter.toUpperCase();
  return upper.length === letter.length ? upper : letter;
}
