// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuelState } from '@/lib/contracts';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';
import { myDuel, READER, RIVAL } from '@/lib/__tests__/helpers/myDuel';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }));

const { FormLine } = await import('@/components/dashboard/FormLine');

const PAST = [
  myDuel(4, { state: DuelState.Resolved, claimedWinner: READER }),
  myDuel(3, { state: DuelState.Resolved, claimedWinner: RIVAL }),
  myDuel(2, { state: DuelState.Refunded }),
];

function chips() {
  return [...screen.getByRole('img').querySelectorAll('[title]')];
}

beforeEach(() => {
  motion.reduced = false;
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FormLine', () => {
  it('reads the latest results out, newest first', () => {
    render(<FormLine past={PAST} gameOf={() => null} />);

    expect(screen.getByRole('img', { name: 'Latest results, newest first: Won, Lost, No winner' })).toBeTruthy();
  });

  it('shows the last ten results only', () => {
    const past = Array.from({ length: 14 }, (_, index) => myDuel(14 - index, { state: DuelState.Resolved, claimedWinner: READER }));

    render(<FormLine past={past} gameOf={() => null} />);

    expect(chips()).toHaveLength(10);
  });

  it('names each chip\'s duel and game', () => {
    render(<FormLine past={PAST} gameOf={(id) => (id === 4 ? { name: 'Chess', category: 'STRATEGY' } : null)} />);

    expect(chips().map((chip) => chip.getAttribute('title'))).toEqual(['#4 Chess: Won', '#3: Lost', '#2: No winner']);
  });

  it('keeps the chips out of sight until the line is seen, then pops them in', () => {
    render(<FormLine past={PAST} gameOf={() => null} />);
    const line = screen.getByRole('img');
    expect(chips().every((chip) => chip.classList.contains('opacity-0'))).toBe(true);

    act(() => FakeIntersectionObserver.watching(line).report(line, true));

    expect(chips().every((chip) => chip.classList.contains('animate-pop'))).toBe(true);
  });

  it('shows the chips at once with motion reduced', () => {
    motion.reduced = true;

    render(<FormLine past={PAST} gameOf={() => null} />);

    expect(chips().some((chip) => chip.classList.contains('opacity-0') || chip.classList.contains('animate-pop'))).toBe(false);
  });
});
