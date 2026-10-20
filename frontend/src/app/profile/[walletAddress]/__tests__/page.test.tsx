import { describe, expect, it, vi } from 'vitest';

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
);
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/components/profile/PlayerProfile', () => ({ PlayerProfile: () => null }));

const { default: PlayerProfilePage } = await import('@/app/profile/[walletAddress]/page');

describe('PlayerProfilePage', () => {
  it('opens the profile of an address, lowercased', async () => {
    const page = await PlayerProfilePage({ params: Promise.resolve({ walletAddress: '0x4BFa1486661d6FAa5300923bd684F261AE4776a5' }) });

    expect(page.props.address).toBe('0x4bfa1486661d6faa5300923bd684f261ae4776a5');
  });

  it('is not found for something that is not an address', async () => {
    await expect(PlayerProfilePage({ params: Promise.resolve({ walletAddress: 'alice' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
