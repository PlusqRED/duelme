import { describe, expect, it } from 'vitest';
import { springStep, type SpringBody, type SpringConfig } from '@/lib/spring';

const FRAME = 1 / 60;

function run(config: SpringConfig, frames: number): SpringBody[] {
  const path: SpringBody[] = [];
  let body: SpringBody = { at: 0, vel: 0 };
  for (let i = 0; i < frames; i += 1) {
    body = springStep(body, 1, config, FRAME);
    path.push(body);
  }
  return path;
}

describe('springStep', () => {
  it('settles on its target', () => {
    const path = run({ k: 230, zeta: 0.74 }, 120);

    expect(path[path.length - 1].at).toBeCloseTo(1, 3);
  });

  it('overshoots a little when under-damped', () => {
    const path = run({ k: 230, zeta: 0.74 }, 120);

    const peak = Math.max(...path.map((body) => body.at));

    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.1);
  });

  it('never overshoots when critically damped', () => {
    const path = run({ k: 2200, zeta: 1 }, 120);

    expect(Math.max(...path.map((body) => body.at))).toBeLessThanOrEqual(1);
  });

  it('stays stable on a long frame', () => {
    const body = springStep({ at: 0, vel: 0 }, 1, { k: 2200, zeta: 1 }, 0.034);

    expect(Number.isFinite(body.at) && body.at > 0 && body.at < 2).toBe(true);
  });

  it('leaves a body at rest on its target where it is', () => {
    expect(springStep({ at: 1, vel: 0 }, 1, { k: 230, zeta: 0.74 }, FRAME)).toEqual({ at: 1, vel: 0 });
  });
});
