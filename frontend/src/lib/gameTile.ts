/**
 * What a game's tile shows: the acronym a name starts with («CS2», «PUBG Mobile» → «PUBG» is four
 * letters, so «PM»), else the first two letters of a one-word name, else the first letters of its
 * first two words.
 */
export function gameInitials(name: string): string {
  const [first, second] = name.trim().split(/\s+/);
  if (!first) return '';
  if (/^[A-Z0-9]{2,3}$/.test(first)) return first;
  if (!second) return first.slice(0, 2).toUpperCase();
  return (first.charAt(0) + second.charAt(0)).toUpperCase();
}
