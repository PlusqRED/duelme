/** Where the language switch posts, and the fields of its form. */
export const LANGUAGE_ROUTE = '/api/language';
export const LANGUAGE_FIELDS = { language: 'language', back: 'back' } as const;

const MAX_BACK_LENGTH = 2048;
const SITE = 'https://duelme.invalid';

/**
 * Where the switch sends the reader back: the page they were on, with its query and the hash a
 * private duel's invite secret sits in, or the home page for anything that is not a path on this
 * site. A value that led elsewhere would make the switch a redirect any site could link through.
 */
export function returnPath(value: unknown): string {
  // A browser writes a page's address in printable ASCII, so anything else, a line break above all,
  // was never one.
  if (typeof value !== 'string' || value.length > MAX_BACK_LENGTH || !/^\/[\x21-\x7e]*$/.test(value)) {
    return '/';
  }
  // '//host' and '/\host' read as another site; resolving the path against this one shows it.
  return new URL(value, SITE).origin === SITE ? value : '/';
}
