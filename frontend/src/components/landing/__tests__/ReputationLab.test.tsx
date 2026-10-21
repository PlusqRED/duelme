// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ReputationLab } from '@/components/landing/ReputationLab';

afterEach(cleanup);

function verdict() {
  const box = screen.getByText(/^(No duel history|Strong history|Some useful history|Too many ignored)/).closest('[aria-live]');
  if (!(box instanceof HTMLElement)) throw new Error('No verdict');
  return within(box);
}

function tally(name: 'Honored' | 'Abandoned') {
  return screen.getByText(name).textContent;
}

describe('ReputationLab', () => {
  it('starts on a player nobody has played yet', () => {
    render(<ReputationLab />);

    expect(verdict().getByText('New')).toBeTruthy();
    expect([tally('Honored'), tally('Abandoned')]).toEqual(['Honored 0', 'Abandoned 0']);
  });

  it('counts a duel seen through and moves the player to Mixed', () => {
    render(<ReputationLab />);

    fireEvent.click(screen.getByRole('button', { name: '+1 honored' }));

    expect(tally('Honored')).toBe('Honored 1');
    expect(verdict().getByText('Mixed')).toBeTruthy();
  });

  it('takes the player down to Risky for a duel walked away from', () => {
    render(<ReputationLab />);
    fireEvent.click(screen.getByRole('button', { name: '+1 honored' }));

    fireEvent.click(screen.getByRole('button', { name: '+1 abandoned' }));

    expect(verdict().getByText('Risky')).toBeTruthy();
  });

  it('starts over from New', () => {
    render(<ReputationLab />);
    fireEvent.click(screen.getByRole('button', { name: '+1 honored' }));

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));

    expect([tally('Honored'), verdict().getByText('New')]).toEqual(['Honored 0', expect.anything()]);
  });
});
