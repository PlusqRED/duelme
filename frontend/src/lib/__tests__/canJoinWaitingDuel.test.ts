import { describe, expect, it } from 'vitest';
import { canJoinWaitingDuel } from '../duel';
import { DuelState } from '../contracts';
import { ZERO_ADDRESS } from '../constants';
import { hashInviteSecret, OPEN_DUEL_INVITE_HASH } from '../invite';

const CONTRACT = '0x588A54Fa8c00c8aC003e41BD8ee26FBC8994105f' as const;
const CHAIN = 421614;
const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const VIEWER = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
const SECRET = `0x${'12'.repeat(32)}` as const;
const PRIVATE_HASH = hashInviteSecret(SECRET, CONTRACT, CHAIN);

function options(overrides: Partial<Parameters<typeof canJoinWaitingDuel>[0]> = {}) {
  return {
    duel: {
      state: DuelState.Created,
      creator: CREATOR,
      inviteHash: OPEN_DUEL_INVITE_HASH,
      invitedOpponent: ZERO_ADDRESS,
    },
    viewerAddress: VIEWER,
    authenticated: true,
    inviteSecret: null,
    contractAddress: CONTRACT,
    chainId: CHAIN,
    ...overrides,
  } satisfies Parameters<typeof canJoinWaitingDuel>[0];
}

describe('canJoinWaitingDuel', () => {
  it('lets a signed-in non-creator join an open waiting duel', () => {
    expect(canJoinWaitingDuel(options())).toBe(true);
  });

  it('lets the holder of the right secret join a private duel', () => {
    expect(canJoinWaitingDuel(options({
      duel: { ...options().duel, inviteHash: PRIVATE_HASH },
      inviteSecret: SECRET,
    }))).toBe(true);
  });

  it('refuses a private duel without the secret', () => {
    expect(canJoinWaitingDuel(options({ duel: { ...options().duel, inviteHash: PRIVATE_HASH } }))).toBe(false);
  });

  it('refuses a private duel with a secret for another duel', () => {
    expect(canJoinWaitingDuel(options({
      duel: { ...options().duel, inviteHash: PRIVATE_HASH },
      inviteSecret: `0x${'34'.repeat(32)}`,
    }))).toBe(false);
  });

  it.each([
    DuelState.Nonexistent,
    DuelState.Funded,
    DuelState.Cancelled,
    DuelState.Declined,
    DuelState.Resolved,
  ])('refuses a duel that is no longer waiting (state %s)', (state) => {
    expect(canJoinWaitingDuel(options({ duel: { ...options().duel, state } }))).toBe(false);
  });

  it('refuses when the duel has not loaded', () => {
    expect(canJoinWaitingDuel(options({ duel: undefined }))).toBe(false);
  });

  it('refuses a signed-out viewer', () => {
    expect(canJoinWaitingDuel(options({ authenticated: false }))).toBe(false);
  });

  it('refuses while the wallet address has not resolved', () => {
    expect(canJoinWaitingDuel(options({ viewerAddress: undefined }))).toBe(false);
  });

  it('refuses the creator, whatever the address case', () => {
    expect(canJoinWaitingDuel(options({ viewerAddress: CREATOR.toLowerCase() }))).toBe(false);
  });

  it('refuses a third party on a duel bound to another address', () => {
    expect(canJoinWaitingDuel(options({
      duel: { ...options().duel, invitedOpponent: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' },
    }))).toBe(false);
  });

  it('lets the invited address join a duel bound to it', () => {
    expect(canJoinWaitingDuel(options({
      duel: { ...options().duel, invitedOpponent: '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb' },
    }))).toBe(true);
  });
});
