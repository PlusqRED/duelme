// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import { DuelState } from '@/lib/contracts';
import { formatDateTime } from '@/lib/utils';
import { duelView } from '@/lib/__tests__/helpers/duelView';

vi.mock('@/hooks/useNicknames', () => ({
  useNicknames: () => ({ resolveDisplay: (address: string) => (address.startsWith('0xAa') ? 'Ace' : 'Bo') }),
}));

const { DuelHistory } = await import('@/components/duel/room/DuelHistory');

const en = translations.en;
const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const OPPONENT = '0x111111111111111111111111111111111111abcd' as const;
const NOW = 2_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW * 1000));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const created = duelView({ creator: CREATOR, message: 'gg, best of 3', createdAt: BigInt(NOW - 7200) });
const joined = duelView({ creator: CREATOR, opponent: OPPONENT, createdAt: BigInt(NOW - 7200), fundedAt: BigInt(NOW - 600), state: DuelState.Funded });

function lines() {
  return screen.getAllByRole('listitem').map((item) => item.querySelector('p')?.textContent);
}

describe('DuelHistory', () => {
  it('tells what happened, oldest first, under its title', () => {
    render(<DuelHistory duel={joined} phase="funded" claimTimeout={3600} walletAddress={undefined} />);

    expect(screen.getByRole('region', { name: en['room.history.title'] })).toBeTruthy();
    expect(lines()).toEqual([en['room.ev.created'].replace('{who}', 'Ace'), en['room.ev.joined'].replace('{who}', 'Bo')]);
  });

  it('calls the reader You in their own lines', () => {
    render(<DuelHistory duel={joined} phase="funded" claimTimeout={3600} walletAddress={OPPONENT} />);

    expect(lines()[1]).toBe(en['room.ev.joined'].replace('{who}', en['room.you']));
  });

  it('says how long ago, with the exact time on hover', () => {
    render(<DuelHistory duel={created} phase="created" claimTimeout={3600} walletAddress={undefined} />);

    const time = screen.getByText(en['timeAgo.hours'].replace('{n}', '2'));
    expect(time.getAttribute('title')).toBe(formatDateTime(BigInt(NOW - 7200), 'en'));
  });

  it('quotes the creator’s message', () => {
    render(<DuelHistory duel={created} phase="created" claimTimeout={3600} walletAddress={undefined} />);

    expect(screen.getByText('“gg, best of 3”')).toBeTruthy();
  });

  it('puts the pot in the payout line', () => {
    const duel = { ...joined, claimedBy: OPPONENT, claimedWinner: CREATOR, claimTimestamp: BigInt(NOW - 60), finalizedAt: BigInt(NOW - 60) };
    render(<DuelHistory duel={duel} phase="resolved" claimTimeout={3600} walletAddress={undefined} />);

    expect(lines().at(-1)?.replace(/ /g, ' ')).toBe(en['room.ev.paid'].replace('{who}', 'Ace').replace('{pot}', '10').replace(/ /g, ' '));
  });

  it('lets a line that arrives while the page is open rise into place', () => {
    const { rerender } = render(<DuelHistory duel={created} phase="created" claimTimeout={3600} walletAddress={undefined} />);

    rerender(<DuelHistory duel={joined} phase="funded" claimTimeout={3600} walletAddress={undefined} />);

    expect(screen.getAllByRole('listitem').map((item) => item.className.includes('animate-swap'))).toEqual([false, true]);
  });
});
