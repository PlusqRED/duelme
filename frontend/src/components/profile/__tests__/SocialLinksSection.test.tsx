// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SocialLinks } from '@/lib/profile';

vi.mock('@/hooks/useSocialLinks', () => ({
  useSocialLinks: () => ({
    startSteam: { isPending: false, mutateAsync: vi.fn() },
    startTelegram: { isPending: false, mutateAsync: vi.fn() },
    setInstagram: { isPending: false, mutateAsync: vi.fn() },
    unlink: { isPending: false, mutateAsync: vi.fn() },
  }),
}));
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const { SocialLinksSection } = await import('@/components/profile/SocialLinksSection');
const { SocialAccounts } = await import('@/components/profile/SocialAccounts');

const LINKED: SocialLinks = {
  steam: { steamId: '7656', username: 'alice', avatarUrl: null, linkedAt: '' },
  telegram: null,
  instagram: { handle: 'alice.gg', linkedAt: '' },
};

afterEach(cleanup);

describe('SocialLinksSection', () => {
  it('offers to connect every platform while none is linked', () => {
    render(<SocialLinksSection socialLinks={null} />);

    expect(screen.getByRole('button', { name: 'Connect Steam' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect Telegram' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Instagram' })).toBeTruthy();
  });

  it('shows a linked account with its proof and the way to unlink it', () => {
    render(<SocialLinksSection socialLinks={LINKED} />);
    const steam = screen.getByRole('link', { name: 'alice' }).closest('li');
    if (!steam) throw new Error('No Steam tile');

    expect(within(steam).getByText('Verified')).toBeTruthy();
    expect(within(steam).getByRole('button', { name: 'Unlink Steam' })).toBeTruthy();
  });

  it('marks an Instagram handle as only typed in, and lets it change', () => {
    render(<SocialLinksSection socialLinks={LINKED} />);
    const instagram = screen.getByRole('link', { name: '@alice.gg' }).closest('li');
    if (!instagram) throw new Error('No Instagram tile');

    expect(within(instagram).getByText('self-reported')).toBeTruthy();
    expect(within(instagram).getByRole('button', { name: 'Edit' })).toBeTruthy();
  });

  it('asks before unlinking an account', () => {
    render(<SocialLinksSection socialLinks={LINKED} />);

    fireEvent.click(screen.getByRole('button', { name: 'Unlink Steam' }));

    expect(screen.getByRole('dialog', { name: 'Unlink Steam?' })).toBeTruthy();
  });
});

describe('SocialAccounts', () => {
  it('lists only the accounts a player linked, each opening in a new tab', () => {
    render(<SocialAccounts links={LINKED} />);

    expect(screen.getAllByRole('link').map((link) => [link.getAttribute('href'), link.getAttribute('target')])).toEqual([
      ['https://steamcommunity.com/profiles/7656', '_blank'],
      ['https://www.instagram.com/alice.gg/', '_blank'],
    ]);
  });

  it('shows nothing for a player without linked accounts', () => {
    const { container } = render(<SocialAccounts links={null} />);

    expect(container.innerHTML).toBe('');
  });
});
