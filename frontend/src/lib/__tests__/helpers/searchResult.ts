import { TITLE_TEMPLATE } from '@/lib/constants';

/** The longest title a search result shows before it cuts it short. */
export const RESULT_TITLE_LIMIT = 60;

/** The longest description a search result shows whole. */
export const RESULT_DESCRIPTION_LIMIT = 160;

/** A page's title as a search result shows it: the site's name follows it. */
export function resultTitle(title: string): string {
  return TITLE_TEMPLATE.replace('%s', title);
}
