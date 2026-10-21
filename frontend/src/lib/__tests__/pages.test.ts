import { describe, expect, it } from 'vitest';
import { clampPage, PAGE_GAP, pageCount, pageNumbers, pageOf } from '@/lib/pages';

describe('pageCount', () => {
  it('counts a part-filled last page as a page', () => {
    expect(pageCount(41, 20)).toBe(3);
  });

  it('calls an empty list one page', () => {
    expect(pageCount(0, 20)).toBe(1);
  });
});

describe('clampPage', () => {
  it('brings a page past the end back to the last one', () => {
    expect(clampPage(5, 30, 20)).toBe(2);
  });

  it('brings a page before the start to the first one', () => {
    expect(clampPage(0, 30, 20)).toBe(1);
  });
});

describe('pageOf', () => {
  it('gives the items of the page asked for', () => {
    expect(pageOf([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
  });

  it('gives the last page for a page past the end', () => {
    expect(pageOf([1, 2, 3, 4, 5], 9, 2)).toEqual([5]);
  });
});

describe('pageNumbers', () => {
  it('shows every page of a short list', () => {
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3]);
  });

  it('folds the pages far from the current one into gaps', () => {
    expect(pageNumbers(5, 10)).toEqual([1, PAGE_GAP, 4, 5, 6, PAGE_GAP, 10]);
  });

  it('shows a single hidden page rather than a gap for it', () => {
    expect(pageNumbers(4, 10)).toEqual([1, 2, 3, 4, 5, PAGE_GAP, 10]);
  });

  it('shows one page for a one-page list', () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
  });
});
