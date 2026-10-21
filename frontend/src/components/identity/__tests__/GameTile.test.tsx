// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GameTile } from '@/components/identity/GameTile';
import type { GameCategory } from '@/lib/game';

afterEach(cleanup);

describe('GameTile', () => {
  it('shows the game initials on its category colour', () => {
    const { container } = render(<GameTile name="Dota 2" category="MOBA" />);
    const tile = container.firstElementChild;

    expect(tile?.textContent).toBe('D2');
    expect(tile?.className.split(' ')).toContain('bg-game-moba');
  });

  it('stays neutral for a category it does not know yet', () => {
    // The backend's list of categories can run ahead of this union.
    const { container } = render(<GameTile name="Puzzle Arena" category={'PUZZLE' as GameCategory} />);

    expect(container.firstElementChild?.className.split(' ')).toContain('bg-canvas-deep');
  });

  it('stays neutral without a category', () => {
    const { container } = render(<GameTile name="Chess" category={null} />);

    expect(container.firstElementChild?.className.split(' ')).toContain('bg-canvas-deep');
  });

  it('shows a gamepad instead of initials for a duel without a game', () => {
    const { container } = render(<GameTile name={null} />);

    expect(container.firstElementChild?.textContent).toBe('');
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
