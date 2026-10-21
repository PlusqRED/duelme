// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import { DEFAULT_CHAIN, DUELME_ADDRESSES } from '@/lib/constants';
import type { Game } from '@/lib/game';
import { truncateAddress } from '@/lib/utils';

const relay = vi.hoisted(() => ({ isRelayEnabled: true }));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => relay }));

const { CreateFacts } = await import('@/components/duel/create/CreateFacts');

afterEach(cleanup);

const en = translations.en;
const CHESS: Game = { slug: 'chess', name: 'Chess', iconUrl: null, category: 'STRATEGY', duelCount: 1, createdAt: null, updatedAt: null };

const valueOf = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('CreateFacts', () => {
  it('says what is not chosen yet', () => {
    render(<CreateFacts chainId={DEFAULT_CHAIN.id} game={null} stakeRaw={null} isPublic={false} />);

    expect(valueOf(en['create.ledger.game'])).toBe(en['create.ledger.none']);
    expect(valueOf(en['room.ledger.pot'])).toBe(en['create.ledger.none']);
  });

  it('fills in the game, the stake from each and the pot', () => {
    render(<CreateFacts chainId={DEFAULT_CHAIN.id} game={CHESS} stakeRaw={5_000_000n} isPublic />);

    expect(valueOf(en['create.ledger.game'])).toBe('Chess');
    expect(valueOf(en['room.ledger.stake'])).toBe(en['room.ledger.each'].replace('{amount}', '5'));
    expect(valueOf(en['room.ledger.pot'])).toBe('10 USDT');
    expect(valueOf(en['room.ledger.access'])).toBe(en['room.ledger.public']);
  });

  it('says who pays the network fee', () => {
    relay.isRelayEnabled = false;

    render(<CreateFacts chainId={DEFAULT_CHAIN.id} game={null} stakeRaw={null} isPublic={false} />);

    expect(valueOf(en['room.ledger.gas'])).toBe(en['room.ledger.gasSelf']);
  });

  it('links the contract on the explorer', () => {
    render(<CreateFacts chainId={DEFAULT_CHAIN.id} game={null} stakeRaw={null} isPublic={false} />);

    const contract = DUELME_ADDRESSES[DEFAULT_CHAIN.id];
    expect(screen.getByRole('link', { name: truncateAddress(contract) }).getAttribute('href')).toBe(`${DEFAULT_CHAIN.explorer}/address/${contract}`);
  });
});
