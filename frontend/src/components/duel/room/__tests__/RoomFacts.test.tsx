// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const relayer = vi.hoisted(() => ({ isRelayEnabled: true }));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => relayer }));

const { RoomFacts } = await import('@/components/duel/room/RoomFacts');

afterEach(() => {
  cleanup();
  relayer.isRelayEnabled = true;
});

const en = translations.en;
const PRIVATE_HASH = `0x${'12'.repeat(32)}` as const;

describe('RoomFacts', () => {
  it('gives the stake each and the pot', () => {
    render(<RoomFacts duel={duelView({ wagerAmount: 5_000_000n })} />);

    expect(screen.getByText(en['room.ledger.stake']).nextElementSibling?.textContent).toBe(en['room.ledger.each'].replace('{amount}', '5'));
    expect(screen.getByText(en['room.ledger.pot']).nextElementSibling?.textContent).toBe('10\u00a0USDT');
  });

  it('says DuelMe pays the network fee while it relays', () => {
    render(<RoomFacts duel={duelView()} />);

    expect(screen.getByText(en['room.ledger.gasValue'])).toBeTruthy();
  });

  it('says the reader’s ETH pays the network fee without the relayer', () => {
    relayer.isRelayEnabled = false;
    render(<RoomFacts duel={duelView()} />);

    expect(screen.getByText(en['room.ledger.gasSelf'])).toBeTruthy();
  });

  it('says anyone can join a public duel', () => {
    render(<RoomFacts duel={duelView()} />);

    expect(screen.getByText(en['room.ledger.public'])).toBeTruthy();
  });

  it('says only the private link lets anyone into a private duel', () => {
    render(<RoomFacts duel={duelView({ inviteHash: PRIVATE_HASH })} />);

    expect(screen.getByText(en['room.ledger.private'])).toBeTruthy();
  });

  it('links the contract on the network’s explorer, in a new tab', () => {
    render(<RoomFacts duel={duelView()} />);

    const link = screen.getByRole<HTMLAnchorElement>('link');
    expect(link.href).toBe(`${DEFAULT_CHAIN.explorer}/address/${DUELME_ADDRESSES[DEFAULT_CHAIN_ID]}`);
    expect(link.rel).toBe('noopener noreferrer');
  });
});
