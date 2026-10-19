// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ pathname: '/', authenticated: false }));
vi.mock('next/navigation', () => ({ usePathname: () => session.pathname }));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ authenticated: session.authenticated }) }));

const { useNavLinks } = await import('@/hooks/useNavLinks');

beforeEach(() => {
  session.pathname = '/';
  session.authenticated = false;
});

afterEach(cleanup);

describe('useNavLinks', () => {
  it('lists the public sections to a visitor, by name', () => {
    const { result } = renderHook(() => useNavLinks());

    expect(result.current.map((link) => link.label)).toEqual(['Public duels', 'Recent duels', 'Games']);
  });

  it('adds My duels for a signed-in player', () => {
    session.authenticated = true;
    const { result } = renderHook(() => useNavLinks());

    expect(result.current.map((link) => link.href)).toEqual(['/duels/public', '/duels/recent', '/games', '/dashboard']);
  });

  it('marks the section of the page you are on, and only it', () => {
    session.pathname = '/games/counter-strike-2';
    const { result } = renderHook(() => useNavLinks());

    expect(result.current.filter((link) => link.isCurrent).map((link) => link.href)).toEqual(['/games']);
  });
});
