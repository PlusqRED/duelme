// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE_QUERY, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { themeTokens } from '@/lib/__tests__/helpers/sourceFiles';

const display = vi.hoisted(() => ({ isPhone: false }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => display.isPhone }));

beforeEach(() => {
  display.isPhone = false;
});

afterEach(cleanup);

function renderMenu() {
  return render(
    <Popover>
      <PopoverTrigger>Wallet</PopoverTrigger>
      <PopoverContent title="Your wallet">
        <button type="button">Send</button>
      </PopoverContent>
    </Popover>
  );
}

describe('Popover', () => {
  it('turns into a sheet below the theme\'s xs breakpoint, where the sheet styles start', () => {
    expect(PHONE_QUERY).toBe(`(width < ${themeTokens('breakpoint').get('xs')})`);
  });

  it('opens from its button, named after its title', async () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Wallet' }));

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Your wallet' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Wallet' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('has a close button labelled in words, for the sheet on a phone', async () => {
    display.isPhone = true;
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Wallet' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Wallet' }).getAttribute('aria-expanded')).toBe('false'));
  });

  it('closes on Escape', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Wallet' }));
    const menu = await screen.findByRole('dialog', { name: 'Your wallet' });

    fireEvent.keyDown(menu, { key: 'Escape' });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Wallet' }).getAttribute('aria-expanded')).toBe('false'));
  });
});
