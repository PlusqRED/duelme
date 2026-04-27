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

  it('returns "tab-notch" for the middle card of a full row', () => {
    expect(getCardShapeForIndex(1, 6)).toBe('tab-notch');
  });

  it('returns "notch" for the last card of a full row when more rows follow', () => {
    expect(getCardShapeForIndex(2, 6)).toBe('notch');
  });

  it('returns "tab" for the first card of a non-final row', () => {
    expect(getCardShapeForIndex(3, 6)).toBe('tab');
  });

  it('returns "notch" for the last card of the grid when its row predecessor had a tab', () => {
    expect(getCardShapeForIndex(5, 6)).toBe('notch');
  });

  it('returns "tab" for index 0 when the row has more cards but the grid stops at the row end', () => {
    expect(getCardShapeForIndex(0, 3)).toBe('tab');
  });

  it('returns "notch" for the last cell of a partial last row', () => {
    expect(getCardShapeForIndex(2, 4)).toBe('notch');
  });

  it('returns "none" for an orphan card alone on the last row', () => {
    expect(getCardShapeForIndex(3, 4)).toBe('none');
  });

  it('returns "notch" for the second of two cards in a single row', () => {
    expect(getCardShapeForIndex(1, 2)).toBe('notch');
  });

  it('respects a custom column count', () => {
    expect(getCardShapeForIndex(1, 4, 2)).toBe('notch');
    expect(getCardShapeForIndex(0, 4, 2)).toBe('tab');
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

  it('produces exactly one quadratic Bézier segment for "notch"', () => {
    const d = getCardShapePath('notch');
    expect(d.match(/Q/g)?.length).toBe(1);
  });

  it('produces exactly two quadratic Bézier segments for "tab-notch"', () => {
    const d = getCardShapePath('tab-notch');
    expect(d.match(/Q/g)?.length).toBe(2);
  });

  it('starts with a move-to command and ends with Z', () => {
    const d = getCardShapePath('tab-notch');
    expect(d.startsWith('M ')).toBe(true);
    expect(d.trimEnd().endsWith('Z')).toBe(true);
  });

  it('includes four arc commands (one per rounded corner) for every shape', () => {
    for (const shape of ['none', 'tab', 'notch', 'tab-notch'] as const) {
      const d = getCardShapePath(shape);
      expect(d.match(/A /g)?.length).toBe(4);
    }
  });
});
