/**
 * What a game's tile shows: the acronym a name starts with («CS2», «PUBG Mobile» → «PUBG» is four
 * letters, so «PM»), else the first two letters of a one-word name, else the first letters of its
 * first two words.
 */
export function gameInitials(name: string): string {
  // By code point, so a name that starts with an emoji keeps it whole.
  const [first, second] = name.trim().split(/\s+/).map((word) => Array.from(word));
  if (!first?.length) return '';
  if (/^[A-Z0-9]{2,3}$/.test(first.join(''))) return first.join('');
  if (!second) return first.slice(0, 2).join('').toUpperCase();
  return (first[0] + second[0]).toUpperCase();
}
