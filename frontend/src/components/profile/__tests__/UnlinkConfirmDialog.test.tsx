// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnlinkConfirmDialog } from '@/components/profile/UnlinkConfirmDialog';

vi.mock('@/hooks/useSocialLinks', () => ({
  useSocialLinks: () => ({ unlink: { isPending: false, mutateAsync: vi.fn() } }),
}));

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

afterEach(cleanup);

describe('UnlinkConfirmDialog', () => {
  it('names the account it unlinks', () => {
    render(<UnlinkConfirmDialog open platform="steam" onOpenChange={() => {}} />);

    expect(screen.getByRole('dialog', { name: 'Unlink Steam?' })).toBeTruthy();
  });

  it('keeps naming the account while the window closes', () => {
    const { rerender } = render(<UnlinkConfirmDialog open platform="steam" onOpenChange={() => {}} />);

    rerender(<UnlinkConfirmDialog open={false} platform={null} onOpenChange={() => {}} />);

    expect(screen.getByText('Unlink Steam?')).toBeTruthy();
  });
});
