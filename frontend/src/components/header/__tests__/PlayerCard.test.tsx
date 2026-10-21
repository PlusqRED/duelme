// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';

const player = vi.hoisted(() => ({
  reputation: { honored: 4, abandoned: 0, isLoading: false, isError: false },
  copied: false,
  copy: vi.fn(async () => true),
}));
vi.mock('@/hooks/useReputation', () => ({ useReputation: () => player.reputation }));
vi.mock('@/hooks/useCopyFeedback', () => ({ useCopyFeedback: () => ({ copied: player.copied, copy: player.copy }) }));

const { PlayerCard } = await import('@/components/header/PlayerCard');

function renderCard(onLeave = vi.fn()) {
  render(<PlayerCard address={ADDRESS} walletAddress={ADDRESS.toLowerCase() as `0x${string}`} isEntering={false} onLeave={onLeave} />);
  return onLeave;
}

beforeEach(() => {
  player.reputation = { honored: 4, abandoned: 0, isLoading: false, isError: false };
  player.copied = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlayerCard', () => {
  it('shows the address, the level reached and the way to the next one', () => {
    renderCard();

    expect(screen.getByText('0x4BFa...76a5')).toBeTruthy();
    expect(screen.getByText('Mixed')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'To Reliable: 4 of 5 honored' })).toBeTruthy();
  });

  it('names the top level once, under the address, and says it is the highest', () => {
    player.reputation = { honored: 5, abandoned: 0, isLoading: false, isError: false };

    renderCard();

    expect(screen.getAllByText('Reliable')).toHaveLength(1);
    expect(screen.getByText('The highest level. An abandoned duel can lower it.')).toBeTruthy();
  });

  it('copies the full address', () => {
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'Copy the address' }));

    expect(player.copy).toHaveBeenCalledWith(ADDRESS);
  });

  it('says Copied in words once it has copied', () => {
    player.copied = true;
    renderCard();

    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it('shows no level until the contract has answered', () => {
    player.reputation = { ...player.reputation, isLoading: true };
    renderCard();

    expect(screen.queryByText('Mixed')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows no level when the contract could not be read, rather than a wrong one', () => {
    player.reputation = { honored: 0, abandoned: 0, isLoading: false, isError: true };
    renderCard();

    expect(screen.queryByText('New')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('leaves the menu for the profile', () => {
    const onLeave = renderCard();

    fireEvent.click(screen.getByRole('link', { name: /Profile/ }));

    expect(onLeave).toHaveBeenCalled();
  });
});
