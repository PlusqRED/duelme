// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motion = vi.hoisted(() => ({ isReduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.isReduced }));

const { useScrambleReveal } = await import('@/hooks/useScrambleReveal');

const GROUPS = ['0x', '588A', '54Fa'];

function Address({ isOn }: { isOn: boolean }) {
  const holder = useRef<HTMLParagraphElement>(null);
  const { groups } = useScrambleReveal(GROUPS, isOn, holder);
  return (
    <p ref={holder} data-testid="address">
      {groups.map((group, index) => (
        <span key={index}>{group}</span>
      ))}
    </p>
  );
}

function shown() {
  return Array.from(screen.getByTestId('address').children, (child) => child.textContent);
}

beforeEach(() => {
  motion.isReduced = false;
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useScrambleReveal', () => {
  it('shows the groups as they are until it is turned on', () => {
    render(<Address isOn={false} />);

    expect(shown()).toEqual(GROUPS);
  });

  it('runs noise of the same length, settles the groups one after another, and ends on them', () => {
    const { rerender } = render(<Address isOn={false} />);
    rerender(<Address isOn />);

    act(() => vi.advanceTimersByTime(400));
    const midway = shown();
    expect(midway.map((group) => group?.length)).toEqual([2, 4, 4]);
    expect(midway[0]).toBe('0x');
    expect(midway[2]).toMatch(/^[0-9a-f]{4}$/);

    act(() => vi.advanceTimersByTime(600));
    expect(shown()).toEqual(GROUPS);
  });

  it('leaves the groups alone with motion reduced', () => {
    motion.isReduced = true;
    const { rerender } = render(<Address isOn={false} />);
    rerender(<Address isOn />);

    act(() => vi.advanceTimersByTime(400));

    expect(shown()).toEqual(GROUPS);
  });
});
