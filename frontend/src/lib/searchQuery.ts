/** The name of the search in a list page's address, which the site's search action fills in too. */
export const SEARCH_PARAM = 'q';

/** A search as the address gives it: the first `q`, or empty without one. */
export function readSearchParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/**
 * The address of the page shown with the search in it: `q` set to the query, or gone when it is
 * empty, everything else in the address kept, the hash too.
 */
export function addressWithSearch(location: Pick<Location, 'pathname' | 'search' | 'hash'>, query: string): string {
  const params = new URLSearchParams(location.search);
  if (query) {
    params.set(SEARCH_PARAM, query);
  } else {
    params.delete(SEARCH_PARAM);
  }
  const search = params.toString();
  return `${location.pathname}${search ? `?${search}` : ''}${location.hash}`;
}
