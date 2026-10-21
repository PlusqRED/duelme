import { describe, expect, it } from 'vitest';
import {
  cellsPerSpan,
  DETENT_PX,
  landingAt,
  nextMark,
  nudge,
  positionOf,
  stakeAt,
  stakeStops,
  stepFrom,
} from '@/lib/stakeScale';

const STOPS = stakeStops(0.3);
const SPANS = STOPS.length - 1;

describe('stakeStops', () => {
  it('runs from the minimum through the presets to the slider’s end', () => {
    expect(STOPS).toEqual([0.3, 3, 5, 10, 25, 50, 100, 500]);
  });

  it('drops the presets a raised minimum is past', () => {
    expect(stakeStops(5)).toEqual([5, 10, 25, 50, 100, 500]);
  });

  it('keeps a span to move in when the minimum is past the slider’s end', () => {
    expect(stakeStops(600)).toEqual([600, 6000]);
  });
});

describe('stepFrom', () => {
  it.each([
    [0.3, 0.1],
    [3, 0.1],
    [5, 0.5],
    [10, 1],
    [50, 1],
    [100, 5],
  ])('moves a stake from %d in steps of %d', (stop, step) => {
    expect(stepFrom(stop)).toBe(step);
  });
});

describe('positionOf', () => {
  it('sets every mark at an equal distance', () => {
    const positions = STOPS.map((stop) => positionOf(STOPS, stop));

    expect(positions).toEqual(STOPS.map((_, index) => index / SPANS));
  });

  it('places a stake between two marks in proportion', () => {
    expect(positionOf(STOPS, 7.5)).toBeCloseTo((2 + 0.5) / SPANS);
  });

  it('puts a stake past the end at the end', () => {
    expect(positionOf(STOPS, 1250)).toBe(1);
  });

  it('puts a stake under the minimum at the start', () => {
    expect(positionOf(STOPS, 0.1)).toBe(0);
  });
});

describe('stakeAt', () => {
  it('lands on each mark at its place', () => {
    const stakes = STOPS.map((_, index) => stakeAt(STOPS, index / SPANS));

    expect(stakes).toEqual(STOPS);
  });

  it('rounds to the tenths between the minimum and 5', () => {
    expect(stakeAt(STOPS, 0.37 / SPANS)).toBe(1.3);
  });

  it('rounds to fives past 100', () => {
    expect(stakeAt(STOPS, (6 + 0.51) / SPANS)).toBe(305);
  });

  it('keeps a place past the ends inside them', () => {
    expect([stakeAt(STOPS, -0.2), stakeAt(STOPS, 1.3)]).toEqual([0.3, 500]);
  });
});

describe('landingAt', () => {
  const WIDTH = 700;

  it('clicks into a mark within the detent', () => {
    const near = 3 / SPANS + (DETENT_PX - 1) / WIDTH;

    expect(landingAt(STOPS, near, WIDTH)).toEqual({ position: 3 / SPANS, stake: 10, mark: 3 });
  });

  it('stays on the step outside the detent', () => {
    const away = 3 / SPANS + (DETENT_PX + 20) / WIDTH;

    expect(landingAt(STOPS, away, WIDTH)).toMatchObject({ position: away, mark: null, stake: stakeAt(STOPS, away) });
  });
});

describe('nextMark', () => {
  it('goes to the next mark up', () => {
    expect(nextMark(STOPS, 4.2, 1)).toBe(5);
  });

  it('goes to the next mark down', () => {
    expect(nextMark(STOPS, 5, -1)).toBe(3);
  });

  it('stays at the end going up', () => {
    expect(nextMark(STOPS, 500, 1)).toBe(500);
  });

  it('stays at the start going down', () => {
    expect(nextMark(STOPS, 0.3, -1)).toBe(0.3);
  });

  it('starts at the minimum when no stake is set', () => {
    expect(nextMark(STOPS, null, 1)).toBe(0.3);
  });

  it('comes back from past the end to the last mark below it', () => {
    expect(nextMark(STOPS, 1250, -1)).toBe(500);
  });
});

describe('nudge', () => {
  it('moves a small stake by a tenth', () => {
    expect(nudge(STOPS, 4.2, 1)).toBe(4.3);
  });

  it('moves down from a mark in the step of the span below', () => {
    expect(nudge(STOPS, 10, -1)).toBe(9.5);
  });

  it('moves a large stake by five', () => {
    expect(nudge(STOPS, 200, 1)).toBe(205);
  });

  it('stays inside the ends', () => {
    expect([nudge(STOPS, 0.3, -1), nudge(STOPS, 500, 1)]).toEqual([0.3, 500]);
  });

  it('starts at the minimum when no stake is set', () => {
    expect(nudge(STOPS, null, -1)).toBe(0.3);
  });
});

describe('cellsPerSpan', () => {
  it('gives a wide bar four cells a span', () => {
    expect(cellsPerSpan(620, SPANS)).toBe(4);
  });

  it('gives a phone’s bar fewer, but never under two', () => {
    expect([cellsPerSpan(260, SPANS), cellsPerSpan(120, SPANS)]).toEqual([2, 2]);
  });

  it('gives a middling bar three', () => {
    expect(cellsPerSpan(320, SPANS)).toBe(3);
  });
});
