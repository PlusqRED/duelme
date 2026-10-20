// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DuelOutcomeNotice } from '@/components/duel/room/DuelOutcomeNotice';
import { translations } from '@/i18n/translations';
import { DuelState, type Duel } from '@/lib/contracts';
import { duelView } from '@/lib/__tests__/helpers/duelView';

afterEach(cleanup);

const en = translations.en;
const WINNER = '0x111111111111111111111111111111111111abcd';

function notice(duel: Duel, overrides: Partial<Parameters<typeof DuelOutcomeNotice>[0]> = {}) {
  return (
    <DuelOutcomeNotice
      duel={duel}
      resolveDisplay={(address) => `name:${address.slice(0, 6)}`}
      canManage
      claimableAmount={0n}
      isBusy={false}
      onClaim={vi.fn()}
      {...overrides}
    />
  );
}

const resolved = duelView({ state: DuelState.Resolved, opponent: WINNER, claimedWinner: WINNER, opponentPayout: 10_000_000n });

describe('DuelOutcomeNotice', () => {
  it('names the winner of a resolved duel', () => {
    render(notice(resolved));

    expect(screen.getByText(`name:0x1111 ${en['recent.won']}!`)).toBeTruthy();
  });

  it('offers the player the money the contract holds for them', () => {
    const onClaim = vi.fn();
    render(notice(resolved, { claimableAmount: 10_000_000n, onClaim }));

    fireEvent.click(screen.getByRole('button', { name: en['action.claimFunds'] }));

    expect(screen.getByText('10 USDT')).toBeTruthy();
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('keeps the button from a reader who does not play, with the hint still there', () => {
    render(notice(resolved, { canManage: false, claimableAmount: 10_000_000n }));

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(en['duel.resolvedClaimHint'])).toBeTruthy();
  });

  it('says nothing of money once every payout was taken', () => {
    render(notice({ ...resolved, opponentClaimed: true }));

    expect(screen.queryByText(en['duel.resolvedClaimHint'])).toBeNull();
  });

  it('holds the button while a transaction or a window is open', () => {
    render(notice(resolved, { claimableAmount: 10_000_000n, isBusy: true }));

    expect(screen.getByRole('button', { name: en['action.claimFunds'] }).hasAttribute('disabled')).toBe(true);
  });

  it.each([
    [DuelState.Refunded, 'duel.refunded'],
    [DuelState.Cancelled, 'duel.cancelled'],
    [DuelState.Declined, 'duel.declined'],
    [DuelState.Disputed, 'duel.disputed'],
    [DuelState.MutuallyCancelled, 'duel.mutuallyCancelled'],
  ] as const)('says how the duel ended (state %i)', (state, key) => {
    render(notice(duelView({ state })));

    expect(screen.getByText(en[key])).toBeTruthy();
  });

  it('says nothing while the duel runs', () => {
    const { container } = render(notice(duelView({ state: DuelState.Funded })));

    expect(container.textContent).toBe('');
  });
});
