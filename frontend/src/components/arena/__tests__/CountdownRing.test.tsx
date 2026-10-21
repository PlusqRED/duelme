// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CountdownRing } from '@/components/arena/CountdownRing';
import type { CountdownTimer } from '@/lib/duel';

afterEach(cleanup);

function ring(timer: CountdownTimer, left?: number) {
  const { container } = render(<CountdownRing timer={timer} left={left} />);
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('No ring drawn');
  return svg;
}

describe('CountdownRing', () => {
  it.each([
    ['running', 'running'],
    ['up', 'up'],
    [null, 'off'],
  ] as const)('tells its styles the clock is %s', (timer, state) => {
    expect(ring(timer).getAttribute('data-timer')).toBe(state);
  });

  it('is drawn for the eye only', () => {
    expect(ring('running').getAttribute('aria-hidden')).toBe('true');
  });

  it('measures the drain along the whole circle', () => {
    const [, drain] = ring('running').querySelectorAll('circle');

    expect(drain.getAttribute('pathLength')).toBe('1');
  });

  it('drains on its own while it only stands for the clock', () => {
    const [, drain] = ring('running').querySelectorAll('circle');

    expect(drain.getAttribute('class')).toContain('animate-drain');
  });

  it('shows the share of a real clock that is left', () => {
    const [, drain] = ring('running', 0.25).querySelectorAll('circle');

    expect(drain.style.strokeDashoffset).toBe('0.75');
    expect(drain.getAttribute('class')).not.toContain('animate-drain');
  });

  it('empties once the real clock has run out', () => {
    const [, drain] = ring('up', 0.4).querySelectorAll('circle');

    expect(drain.style.strokeDashoffset).toBe('1');
  });
});
