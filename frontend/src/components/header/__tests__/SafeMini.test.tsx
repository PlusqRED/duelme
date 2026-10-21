// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { summarizeOwed, type Owed, type OwedItem } from '@/lib/owed';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }));

const { SafeMini } = await import('@/components/header/SafeMini');

const WIN: OwedItem = { duelId: 7, seat: 'opponent', kind: 'win', raw: 10_000_000n };
const BACK: OwedItem = { duelId: 3, seat: 'creator', kind: 'back', raw: 5_000_000n };

function owedOf(items: OwedItem[]): Owed {
  const owed = summarizeOwed(items);
  if (!owed) throw new Error('A safe needs money in it');
  return owed;
}

function renderSafe(owed: Owed, { isEntering = false, onLeave = vi.fn() } = {}) {
  render(<SafeMini owed={owed} isEntering={isEntering} onLeave={onLeave} />);
  return onLeave;
}

function bars() {
  return [...screen.getByRole('group').querySelectorAll('[data-tone]')].map((bar) => [bar.getAttribute('data-tone'), bar.textContent]);
}

beforeEach(() => {
  motion.reduced = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('SafeMini', () => {
  it('says how much waits in the contract, under its name', () => {
    renderSafe(owedOf([WIN, BACK]));

    expect(screen.getByRole('group', { name: 'Waiting for you in the contract' })).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
  });

  it('gives each duel a bar with its money, a win in the payout\'s sun and a stake in its seat\'s colour', () => {
    renderSafe(owedOf([BACK, WIN]));

    expect(bars()).toEqual([
      ['win', '10'],
      ['creator', '5'],
    ]);
  });

  it('puts the duels that do not fit in one last bar', () => {
    renderSafe(owedOf([1, 2, 3, 4, 5].map((duelId): OwedItem => ({ ...BACK, duelId }))));

    expect(bars().at(-1)).toEqual(['more', '+2']);
  });

  it('leads Take to the dashboard\'s safe, out of the menu', () => {
    const onLeave = renderSafe(owedOf([BACK]));
    const take = screen.getByRole('link', { name: 'Take' });

    fireEvent.click(take);

    expect(take.getAttribute('href')).toBe('/dashboard#collect');
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it('counts the sum up from nothing once the safe has opened', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    renderSafe(owedOf([WIN, BACK]), { isEntering: true });
    expect(screen.getByText('0')).toBeTruthy();

    // The lock opens first; the count then runs frame by frame.
    act(() => vi.advanceTimersByTime(300));
    act(() => vi.advanceTimersByTime(1_000));

    expect(screen.getByText('15')).toBeTruthy();
  });

  it('shows the sum at once with motion reduced', () => {
    motion.reduced = true;

    renderSafe(owedOf([WIN, BACK]), { isEntering: true });

    expect(screen.getByText('15')).toBeTruthy();
  });
});
