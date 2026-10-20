// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import { storeInviteSecret } from '@/lib/invite';

const clipboard = vi.hoisted(() => ({ copyText: vi.fn() }));
vi.mock('@/lib/clipboard', () => ({ copyText: clipboard.copyText }));

const { CopyInviteButton } = await import('@/components/dashboard/CopyInviteButton');

const SECRET = `0x${'ab'.repeat(32)}` as const;

beforeEach(() => {
  window.localStorage.clear();
  clipboard.copyText.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CopyInviteButton', () => {
  it('offers nothing without the invite secret this browser kept', () => {
    const { container } = render(<CopyInviteButton duelId={9} />);

    expect(container.innerHTML).toBe('');
  });

  it('copies the full invite, with its secret', async () => {
    storeInviteSecret(DEFAULT_CHAIN_ID, DUELME_ADDRESSES[DEFAULT_CHAIN_ID], 9, SECRET);
    render(<CopyInviteButton duelId={9} />);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy the link' })));

    expect(clipboard.copyText).toHaveBeenCalledWith(`${window.location.origin}/duel/9#${SECRET}`);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it('reads the secret of the duel in this contract only', () => {
    storeInviteSecret(DEFAULT_CHAIN_ID, '0x000000000000000000000000000000000000dEaD', 9, SECRET);

    const { container } = render(<CopyInviteButton duelId={9} />);

    expect(container.innerHTML).toBe('');
  });
});
