import { describe, expect, it } from 'vitest';
import { seatMove, turnView } from '@/lib/turnView';
import { duelView } from './helpers/duelView';
import { PRIVATE_HASH, creator, joined, joiner, opponent, spectator, viewer } from './helpers/turnViewers';

describe('seatMove', () => {
  it('joins from the seat when the panel offers Join', () => {
    expect(seatMove(turnView(duelView(), 'created', joiner))).toBe('join');
  });

  it('tops up from the seat while the wallet is short of the stake', () => {
    expect(seatMove(turnView(duelView(), 'created', viewer({ isSignedIn: true, canJoin: true, shortRaw: 1_500_000n })))).toBe('topUp');
  });

  it('signs a signed-out reader in from the seat', () => {
    expect(seatMove(turnView(duelView(), 'created', viewer()))).toBe('signIn');
  });

  it('joins from the seat of a private duel, never declines', () => {
    expect(seatMove(turnView(duelView({ inviteHash: PRIVATE_HASH }), 'created', joiner))).toBe('join');
  });

  it('gives the creator nothing to do from the seat', () => {
    expect(seatMove(turnView(duelView(), 'created', creator))).toBeNull();
  });

  it('gives a reader whose link lacks its key nothing to do from the seat', () => {
    expect(seatMove(turnView(duelView({ inviteHash: PRIVATE_HASH }), 'created', viewer({ isSignedIn: true, hasKey: false })))).toBeNull();
  });

  it('gives a signed-in reader the contract would not take nothing to do from the seat', () => {
    expect(seatMove(turnView(duelView(), 'created', spectator))).toBeNull();
  });

  it('takes no seat once the match is on', () => {
    expect(seatMove(turnView(joined(), 'funded', opponent))).toBeNull();
  });
});
