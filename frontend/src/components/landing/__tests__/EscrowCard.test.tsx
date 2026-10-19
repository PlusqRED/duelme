// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

const clipboard = vi.hoisted(() => ({ copied: false, copy: vi.fn(async () => true) }));
vi.mock('@/hooks/useCopyFeedback', () => ({ useCopyFeedback: () => clipboard }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { EscrowCard } = await import('@/components/landing/EscrowCard');

const CONTRACT = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
const PAGE = `${DEFAULT_CHAIN.explorer}/address/${CONTRACT}`;

beforeEach(() => {
  clipboard.copied = false;
  clipboard.copy.mockClear();
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EscrowCard', () => {
  it('reads the contract’s address out whole', () => {
    render(<EscrowCard />);

    expect(screen.getByText(CONTRACT)).toBeTruthy();
  });

  it('copies the contract’s address', () => {
    render(<EscrowCard />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy address' }));

    expect(clipboard.copy).toHaveBeenCalledWith(CONTRACT);
  });

  it('says the address was copied', () => {
    clipboard.copied = true;

    render(<EscrowCard />);

    expect(screen.getByText('Address copied')).toBeTruthy();
  });

  it('opens the contract on the explorer, each link at its own tab, in a new tab', () => {
    render(<EscrowCard />);
    const links = screen.getAllByRole('link');

    expect(links.map((link) => link.getAttribute('href'))).toEqual([PAGE, `${PAGE}#writeContract`, `${PAGE}#code`]);
    expect(links.every((link) => link.getAttribute('rel') === 'noopener noreferrer')).toBe(true);
  });

  it('says what the link it points at shows', () => {
    render(<EscrowCard />);

    fireEvent.focus(screen.getByRole('link', { name: /Every function/ }));

    expect(screen.getByText('Inspect exactly what each contract call can — and cannot — do.', { selector: 'p' })).toBeTruthy();
  });
});
