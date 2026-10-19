// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

const relayer = vi.hoisted(() => ({ isRelayEnabled: true }));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => relayer }));
vi.mock('@/hooks/useOpenDuels', () => ({ useOpenDuels: () => ({ duels: [] }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { GettingStarted } = await import('@/components/landing/GettingStarted');

function step(name: string) {
  return screen.getByRole('button', { name: new RegExp(`^\\d ${name}$`) });
}

beforeEach(() => {
  relayer.isRelayEnabled = true;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GettingStarted', () => {
  it('walks the quest one step at a time and ends on a duel to create', () => {
    render(<GettingStarted />);

    for (let move = 0; move < 3; move++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    }
    expect(screen.getByText('Step 4 of 4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    expect(screen.getByText('All 4 steps done')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Create a duel' }));
  });

  it('opens any step from the list, the others closed', () => {
    render(<GettingStarted />);

    fireEvent.click(step('Fund it once'));

    expect(step('Fund it once').getAttribute('aria-expanded')).toBe('true');
    expect(step('Quick sign-in').getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('Step 3 of 4')).toBeTruthy();
  });

  it('goes through again from the first step, with focus on the way on', () => {
    render(<GettingStarted />);
    fireEvent.click(step('Create or join a duel'));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    fireEvent.click(screen.getByRole('button', { name: 'Go through again' }));

    expect(screen.getByText('Step 1 of 4')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next step' }));
  });

  it('says duel actions are paid in ETH where DuelMe does not pay the network fee', () => {
    relayer.isRelayEnabled = false;
    render(<GettingStarted />);

    fireEvent.click(step('Fund it once'));

    expect(screen.getByText('Add USDT for wagers, and a little ETH for the network fees of duel actions.')).toBeTruthy();
  });
});
