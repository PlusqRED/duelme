// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SocialLinks } from '@/lib/profile';

const clipboard = vi.hoisted(() => ({ copyText: vi.fn(async () => true) }));
vi.mock('@/lib/clipboard', () => clipboard);
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const { ProfileFace } = await import('@/components/profile/ProfileFace');
const { CopyAddress } = await import('@/components/profile/CopyAddress');

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const WITH_PHOTO: SocialLinks = {
  steam: null,
  telegram: { telegramId: '1', username: 'alice', displayName: 'Alice', photoUrl: 'https://t.me/i/alice.jpg', linkedAt: '' },
  instagram: null,
};

afterEach(cleanup);

describe('ProfileFace', () => {
  it('shows the photo of a linked account', () => {
    render(<ProfileFace profile={{ socialLinks: WITH_PHOTO }} displayName="alice" address={ADDRESS} />);

    expect(screen.getByRole('img', { name: 'Profile image for alice' }).getAttribute('src')).toBe('https://t.me/i/alice.jpg');
  });

  it('falls back to the identicon when the photo fails to load', () => {
    render(<ProfileFace profile={{ socialLinks: WITH_PHOTO }} displayName="alice" address={ADDRESS} />);

    fireEvent.error(screen.getByRole('img', { name: 'Profile image for alice' }));

    expect(screen.getByRole('img', { name: 'Profile image for alice' }).tagName).toBe('SPAN');
  });

  it('shows the identicon without a linked photo', () => {
    render(<ProfileFace profile={null} displayName="alice" address={ADDRESS} />);

    expect(screen.getByRole('img', { name: 'Profile image for alice' }).tagName).toBe('SPAN');
  });
});

describe('CopyAddress', () => {
  it('copies the whole address and says it did', async () => {
    render(<CopyAddress address={ADDRESS} />);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy the address' })));

    expect(clipboard.copyText).toHaveBeenCalledWith(ADDRESS);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it('writes the address out whole when asked', () => {
    render(<CopyAddress address={ADDRESS} isFull />);

    expect(screen.getByText(ADDRESS)).toBeTruthy();
  });
});
