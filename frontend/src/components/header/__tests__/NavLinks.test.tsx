// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavItem } from '@/hooks/useNavLinks';

const links = vi.hoisted(() => ({ items: [] as NavItem[] }));
vi.mock('@/hooks/useNavLinks', () => ({ useNavLinks: () => links.items }));

const { NavLinks } = await import('@/components/header/NavLinks');

/** Lays the bar out: the room the bar leaves its row, and the row's own width. */
function layOut(room: number, row: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { width: this.tagName === 'NAV' ? room : row } as DOMRect;
  });
}

beforeEach(() => {
  links.items = [
    { href: '/duels/public', label: 'Public duels', current: undefined },
    { href: '/games', label: 'Games', current: 'page' },
  ];
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NavLinks', () => {
  it('lists the sections as links', () => {
    layOut(702, 681);
    render(<NavLinks />);

    expect(screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Public duels', '/duels/public'],
      ['Games', '/games'],
    ]);
  });

  it('marks the page you are on', () => {
    layOut(702, 681);
    render(<NavLinks />);

    expect(screen.getByRole('link', { name: 'Games' }).getAttribute('aria-current')).toBe('page');
  });

  it('marks the bar as fitting while the row fits', () => {
    layOut(702, 681);
    render(<NavLinks />);

    expect(marks()).toEqual({ crowded: false, fits: true });
  });

  it('marks the bar crowded for the menu when the row does not fit', () => {
    layOut(680, 681);
    render(<NavLinks />);

    expect(marks()).toEqual({ crowded: true, fits: false });
  });

  it('marks the bar neither way until it is laid out', () => {
    layOut(0, 0);
    render(<NavLinks />);

    expect(marks()).toEqual({ crowded: false, fits: false });
  });
});

function marks() {
  const bar = screen.getByRole('navigation', { name: 'Main' });
  return { crowded: bar.hasAttribute('data-crowded'), fits: bar.hasAttribute('data-fits') };
}
