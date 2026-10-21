// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ pathname: '/games', authenticated: false, inView: null as string | null }));
vi.mock('next/navigation', () => ({ usePathname: () => session.pathname }));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ authenticated: session.authenticated }) }));
vi.mock('@/hooks/useSectionInView', () => ({ useSectionInView: () => session.inView }));

const { useNavLinks } = await import('@/hooks/useNavLinks');

beforeEach(() => {
  session.pathname = '/games';
  session.authenticated = false;
  session.inView = null;
});

afterEach(cleanup);

describe('useNavLinks', () => {
  it('lists the public pages to a visitor, by name', () => {
    const { result } = renderHook(() => useNavLinks());

    expect(result.current.map((link) => link.label)).toEqual(['Public duels', 'Recent duels', 'Games']);
  });

  it('adds My duels for a signed-in player', () => {
    session.authenticated = true;
    const { result } = renderHook(() => useNavLinks());

    expect(result.current.map((link) => link.href)).toEqual(['/duels/public', '/duels/recent', '/games', '/dashboard']);
  });

  it('marks the page you are in, and only it', () => {
    session.pathname = '/games/counter-strike-2';
    const { result } = renderHook(() => useNavLinks());

    expect(result.current.filter((link) => link.current).map((link) => [link.href, link.current])).toEqual([
      ['/games', 'page'],
    ]);
  });

  it('lists the landing’s own sections on the landing, by name', () => {
    session.pathname = '/';
    const { result } = renderHook(() => useNavLinks());

    expect(result.current.map((link) => [link.href, link.label])).toEqual([
      ['#public-duels', 'Public duels'],
      ['#recent-duels', 'Recent duels'],
      ['#demo', 'How it works'],
      ['#safety', 'Safety'],
    ]);
  });

  it('follows the landing’s sections with My duels for a signed-in player', () => {
    session.pathname = '/';
    session.authenticated = true;
    const { result } = renderHook(() => useNavLinks());

    expect(result.current.at(-1)).toEqual({ href: '/dashboard', label: 'My duels', current: undefined });
  });

  it('marks the landing’s section being read, and only it', () => {
    session.pathname = '/';
    session.inView = 'demo';
    const { result } = renderHook(() => useNavLinks());

    expect(result.current.filter((link) => link.current).map((link) => [link.href, link.current])).toEqual([
      ['#demo', 'location'],
    ]);
  });

  it('marks the section a link was followed to over the one the glide passes on the way', () => {
    session.pathname = '/';
    session.inView = 'recent-duels';
    const { result, rerender } = renderHook(() => useNavLinks());

    act(() => result.current.find((link) => link.href === '#safety')?.onFollow?.());
    session.inView = 'demo';
    rerender();

    expect(result.current.filter((link) => link.current).map((link) => link.href)).toEqual(['#safety']);
  });
});
