import { describe, it, expect } from 'vitest';
import { parseWager, projectWagerToSlider } from '../wager';

describe('parseWager', () => {
  it('returns zero numeric for empty input', () => {
    const parsed = parseWager('');
    expect(parsed.numeric).toBe(0);
    expect(parsed.pot).toBe(0);
    expect(parsed.isValidNumber).toBe(false);
  });

  it('doubles the wager for the pot', () => {
    expect(parseWager('5').pot).toBe(10);
  });

  it('treats NaN-like input as zero', () => {
    expect(parseWager('abc').numeric).toBe(0);
  });
});

describe('projectWagerToSlider', () => {
  const range = { min: 3, max: 500 };

  it('snaps empty / zero / negative input to the floor', () => {
    expect(projectWagerToSlider(0, range)).toEqual({
      value: 3,
      percent: 0,
      isAboveRange: false,
    });
    expect(projectWagerToSlider(-5, range).value).toBe(3);
    expect(projectWagerToSlider(Number.NaN, range).value).toBe(3);
  });

  it('clamps values above max and flags them', () => {
    const state = projectWagerToSlider(1000, range);
    expect(state.value).toBe(500);
    expect(state.percent).toBe(100);
    expect(state.isAboveRange).toBe(true);
  });

  it('computes a linear percent between min and max', () => {
    const state = projectWagerToSlider(252, range);
    expect(state.isAboveRange).toBe(false);
    expect(state.percent).toBeCloseTo(50.1, 1);
  });

  it('is exactly 0% at min and 100% at max', () => {
    expect(projectWagerToSlider(3, range).percent).toBe(0);
    expect(projectWagerToSlider(500, range).percent).toBe(100);
  });
});
