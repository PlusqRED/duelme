import { describe, expect, it } from 'vitest';
import {
  getCardShapeForIndex,
  getCardShapePath,
  LG_COLUMN_COUNT,
} from '../cardShapes';

describe('LG_COLUMN_COUNT', () => {
  it('exports the canonical column count for the lg grid', () => {
    expect(LG_COLUMN_COUNT).toBe(3);
  });
});

describe('getCardShapeForIndex', () => {
  it('returns "none" when there is only one card overall', () => {
    expect(getCardShapeForIndex(0, 1)).toBe('none');
  });

  it('returns "tab" for the first card of a full row with cards following', () => {
    expect(getCardShapeForIndex(0, 6)).toBe('tab');
  });

  it('returns "tab" for the middle card of a full row', () => {
    expect(getCardShapeForIndex(1, 6)).toBe('tab');
  });

  it('returns "none" for the last card of a full row even when more rows follow', () => {
    expect(getCardShapeForIndex(2, 6)).toBe('none');
  });

  it('returns "tab" for the first card of a non-final row', () => {
    expect(getCardShapeForIndex(3, 6)).toBe('tab');
  });

  it('returns "none" for the last card of the grid', () => {
    expect(getCardShapeForIndex(5, 6)).toBe('none');
  });

  it('returns "tab" for index 0 when the row has more cards but the grid stops at the row end', () => {
    expect(getCardShapeForIndex(0, 3)).toBe('tab');
  });

  it('returns "none" for the last cell of a partial last row', () => {
    expect(getCardShapeForIndex(2, 4)).toBe('none');
  });

  it('returns "none" for an orphan card alone on the last row', () => {
    expect(getCardShapeForIndex(3, 4)).toBe('none');
  });

  it('returns "none" for the second (and last) of two cards in a single row', () => {
    expect(getCardShapeForIndex(1, 2)).toBe('none');
  });

  it('respects a custom column count', () => {
    expect(getCardShapeForIndex(0, 4, 2)).toBe('tab');
    expect(getCardShapeForIndex(1, 4, 2)).toBe('none');
  });
});

describe('getCardShapePath', () => {
  it('produces no quadratic Bézier segments for "none"', () => {
    const d = getCardShapePath('none');
    expect(d.match(/Q/g)).toBeNull();
  });

  it('produces exactly one quadratic Bézier segment for "tab"', () => {
    const d = getCardShapePath('tab');
    expect(d.match(/Q/g)?.length).toBe(1);
  });

  it('starts with a move-to command and ends with Z', () => {
    for (const shape of ['none', 'tab'] as const) {
      const d = getCardShapePath(shape);
      expect(d.startsWith('M ')).toBe(true);
      expect(d.trimEnd().endsWith('Z')).toBe(true);
    }
  });

  it('includes four arc commands (one per rounded corner) for every shape', () => {
    for (const shape of ['none', 'tab'] as const) {
      const d = getCardShapePath(shape);
      expect(d.match(/A /g)?.length).toBe(4);
    }
  });
});
