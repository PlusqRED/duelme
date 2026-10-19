// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ReputationPill } from '@/components/identity/ReputationPill';
import type { ReputationLevel } from '@/lib/reputation';

afterEach(cleanup);

function filledBars(container: HTMLElement) {
  return [...container.querySelectorAll('[aria-hidden="true"] > span')].filter(
    (bar) => !bar.className.split(' ').includes('bg-line-strong') && !bar.className.includes('ring-1')
  ).length;
}

describe('ReputationPill', () => {
  it.each([
    ['new', 'New', 0],
    ['unreliable', 'Risky', 1],
    ['fair', 'Mixed', 2],
    ['honorable', 'Reliable', 3],
  ] as [ReputationLevel, string, number][])('shows %s as %s with %i bars filled', (level, label, bars) => {
    const { container } = render(<ReputationPill level={level} />);

    expect(screen.getByText(label)).toBeTruthy();
    expect(filledBars(container)).toBe(bars);
  });

  it('colours Risky orange, never the red of a player', () => {
    const { container } = render(<ReputationPill level="unreliable" />);

    expect(container.firstElementChild?.className).toContain('bg-orange-soft');
    expect(container.firstElementChild?.className).not.toMatch(/bg-red/);
  });
});
