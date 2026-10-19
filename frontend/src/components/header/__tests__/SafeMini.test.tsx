// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Owed, OwedItem } from '@/lib/owed';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }));

const { SafeMini } = await import('@/components/header/SafeMini');

function owedOf(items: OwedItem[]): Owed {
  return {
    items,
    totalRaw: items.reduce((total, item) => total + item.raw, 0n),
    hasWin: items.some((item) => item.kind === 'win'),
  };
}

const WIN: OwedItem = { duelId: 7, seat: 'opponent', kind: 'win', raw: 10_000_000n };
const BACK: OwedItem = { duelId: 3, seat: 'creator', kind: 'back', raw: 5_000_000n };

function renderSafe(owed: Owed, { isEntering = false, onLeave = vi.fn() } = {}) {
  render(<SafeMini owed={owed} isEntering={isEntering} onLeave={onLeave} />);
  return onLeave;
}

beforeEach(() => {
  motion.reduced = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SafeMini', () => {
  it('says how much waits in the contract, under its name', () => {
    renderSafe(owedOf([WIN, BACK]));

    const safe = screen.getByRole('group', { name: 'Waiting for you in the contract' });
    expect(safe.textContent).toContain('15USDT');
  });

  it('gives each duel a bar with its money', () => {
    renderSafe(owedOf([WIN, BACK]));

    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('puts the duels that do not fit in one last bar', () => {
    const items = [1, 2, 3, 4, 5].map((duelId): OwedItem => ({ ...BACK, duelId }));
    renderSafe(owedOf(items));

    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('leads Take to the dashboard, out of the menu', () => {
    const onLeave = renderSafe(owedOf([BACK]));

    const take = screen.getByRole('link', { name: 'Take' });
    fireEvent.click(take);

    expect(take.getAttribute('href')).toBe('/dashboard');
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it('counts the sum up from nothing as the safe opens', () => {
    renderSafe(owedOf([WIN, BACK]), { isEntering: true });

    expect(screen.getByRole('group').querySelector('b')?.textContent).toBe('0');
  });

  it('shows the sum at once with motion reduced', () => {
    motion.reduced = true;
    renderSafe(owedOf([WIN, BACK]), { isEntering: true });

    expect(screen.getByRole('group').querySelector('b')?.textContent).toBe('15');
  });
});
