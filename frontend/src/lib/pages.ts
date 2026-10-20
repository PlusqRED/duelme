/** A list read in pages: how many there are, never fewer than one, so an empty list is page 1 of 1. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** The page asked for, kept inside the list: a filter that shortens it brings the reader back to its end. */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize));
}

/** The items on one page, counted from 1. */
export function pageOf<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const start = (clampPage(page, items.length, pageSize) - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** A gap between page numbers a pager leaves out. */
export const PAGE_GAP = 'gap';

/**
 * The page numbers a pager shows: the first and the last, and the current one with a neighbour on
 * each side, the rest folded into gaps. A gap that would hide a single page shows that page instead.
 */
export function pageNumbers(current: number, count: number): (number | typeof PAGE_GAP)[] {
  const shown = new Set([1, count, current - 1, current, current + 1].filter((page) => page >= 1 && page <= count));
  const sorted = [...shown].sort((a, b) => a - b);
  const result: (number | typeof PAGE_GAP)[] = [];
  for (const page of sorted) {
    const previous = result.at(-1);
    if (typeof previous === 'number' && page - previous === 2) {
      result.push(previous + 1);
    } else if (typeof previous === 'number' && page - previous > 2) {
      result.push(PAGE_GAP);
    }
    result.push(page);
  }
  return result;
}
