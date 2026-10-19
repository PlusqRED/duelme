// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CountdownRing, type CountdownTimer } from '@/components/arena/CountdownRing';

afterEach(cleanup);

function ring(timer: CountdownTimer) {
  const { container } = render(<CountdownRing timer={timer} />);
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
});
