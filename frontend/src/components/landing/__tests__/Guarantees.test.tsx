// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }));

const { Guarantees } = await import('@/components/landing/Guarantees');

beforeEach(() => {
  motion.reduced = false;
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Guarantees', () => {
  it('names how many tests the contract has and how much of it they cover', () => {
    render(<Guarantees />);

    expect(screen.getByRole('heading', { name: '311\u00a0tests, 94.9% coverage' })).toBeTruthy();
  });

  it('keeps the badges locked until they are seen', () => {
    render(<Guarantees />);
    const badges = screen.getByRole('list');
    expect(badges.hasAttribute('data-pending')).toBe(true);

    act(() => FakeIntersectionObserver.watching(badges).report(badges, true));

    expect(badges.hasAttribute('data-pending')).toBe(false);
  });

  it('shows every badge unlocked at once with motion reduced', () => {
    motion.reduced = true;

    render(<Guarantees />);

    expect(screen.getByRole('list').hasAttribute('data-pending')).toBe(false);
  });
});
