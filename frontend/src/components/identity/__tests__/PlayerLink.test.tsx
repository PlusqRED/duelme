// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PlayerLink } from '@/components/identity/PlayerLink';

afterEach(cleanup);

describe('PlayerLink', () => {
  it('testPlayerLinkLeadsToThePlayersProfile', () => {
    render(<PlayerLink address="0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa">Ace</PlayerLink>);

    expect(screen.getByRole('link', { name: 'Ace' }).getAttribute('href')).toBe('/profile/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('testPlayerLinkKeepsTheCallersLook', () => {
    render(
      <PlayerLink address="0x111111111111111111111111111111111111abcd" className="font-bold">
        Bo
      </PlayerLink>
    );

    expect(screen.getByRole('link', { name: 'Bo' }).className).toContain('font-bold');
  });
});
