// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';

const clipboard = vi.hoisted(() => ({ copied: false, copy: vi.fn(async () => true) }));
vi.mock('@/hooks/useCopyFeedback', () => ({ useCopyFeedback: () => clipboard }));

const { InviteLinkBox } = await import('@/components/duel/room/InviteLinkBox');

afterEach(() => {
  cleanup();
  clipboard.copied = false;
  clipboard.copy.mockClear();
});

const en = translations.en;
const LINK = 'https://dev.duelme.pro/duel/6#k=0xabc';

describe('InviteLinkBox', () => {
  it('shows the link without its scheme', () => {
    render(<InviteLinkBox link={LINK} isPublic={false} />);

    expect(screen.getByLabelText<HTMLInputElement>(en['room.share.label']).value).toBe('dev.duelme.pro/duel/6#k=0xabc');
  });

  it('copies the whole link, key included', () => {
    render(<InviteLinkBox link={LINK} isPublic={false} />);

    fireEvent.click(screen.getByRole('button', { name: en['room.share.copy'] }));

    expect(clipboard.copy).toHaveBeenCalledWith(LINK);
  });

  it('says Copied once the link landed', () => {
    clipboard.copied = true;
    render(<InviteLinkBox link={LINK} isPublic />);

    expect(screen.getByRole('button', { name: en['room.share.copied'] }).className).toContain('bg-good');
  });

  it('offers nothing to copy for a private duel whose key this browser lacks', () => {
    render(<InviteLinkBox link={null} isPublic={false} />);

    expect(screen.getByLabelText<HTMLInputElement>(en['room.share.label']).value).toBe(en['room.share.unavailable']);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: en['room.share.copy'] }).disabled).toBe(true);
  });

  it('says a public duel lets anyone in', () => {
    render(<InviteLinkBox link={LINK} isPublic />);

    expect(screen.getByText(en['room.share.public'])).toBeTruthy();
  });

  it('says a private duel’s link is for one person', () => {
    render(<InviteLinkBox link={LINK} isPublic={false} />);

    expect(screen.getByText(en['room.share.private'])).toBeTruthy();
  });
});
