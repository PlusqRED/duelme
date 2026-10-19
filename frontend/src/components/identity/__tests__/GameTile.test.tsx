// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GameTile } from '@/components/identity/GameTile';

afterEach(cleanup);

describe('GameTile', () => {
  it('shows the game initials on its category colour', () => {
    const { container } = render(<GameTile name="Dota 2" category="MOBA" />);
    const tile = container.firstElementChild;

    expect(tile?.textContent).toBe('D2');
    expect(tile?.className.split(' ')).toContain('bg-game-moba');
  });

  it('stays neutral without a category', () => {
    const { container } = render(<GameTile name="Chess" category={null} />);

    expect(container.firstElementChild?.className.split(' ')).toContain('bg-canvas-deep');
  });
});
