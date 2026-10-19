// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';

const clipboard = vi.hoisted(() => ({ copied: false, copy: vi.fn(async () => true) }));
vi.mock('@/hooks/useCopyFeedback', () => ({ useCopyFeedback: () => clipboard }));

const { AddressGroups } = await import('@/components/topup/AddressGroups');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  clipboard.copied = false;
});

describe('AddressGroups', () => {
  it('shows the address after its 0x in groups of four', () => {
    render(<AddressGroups address={ADDRESS} />);

    expect(screen.getByText('0x 4BFa 1486 661d 6FAa 5300 923b d684 F261 AE47 76a5')).toBeTruthy();
  });

  it('copies the address whole, without the spaces it is shown with', () => {
    render(<AddressGroups address={ADDRESS} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(clipboard.copy).toHaveBeenCalledWith(ADDRESS);
  });

  it('says Copied once the copy landed', () => {
    clipboard.copied = true;
    render(<AddressGroups address={ADDRESS} />);

    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });
});
